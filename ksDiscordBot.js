const Discord = require('discord.js')
const fetch = require('node-fetch')

// Defaults
const defaultOpts = {
    apiKey : null,
    channelKey : null,
    campaign : null,
    goal : null,
    pollRate : 30,
    notifyOnChange : false,
    resetDaily : false,
    showLink : false,
    showTotalChange: false
}

// Empty dataset for clearing values
const emptyDataset = {
    pledged:0,
    backers_count:0,
    comments_count:0
}

// Some state vars
let stats = {}
let firstRun = true
let lastChangedTime

// ksDiscordBot!
class ksDiscordBot {

    constructor(opts = {}) {
        // Set default options
        this.opts = Object.assign(defaultOpts, opts)

        if (!(this.opts.apiKey && this.opts.channelKey && this.opts.campaign)) {
            throw `Cannot initialize with no Discord API KEY and target campaign/channel`
        }

        // Initialization of totals / lastChanged
        stats.totals = Object.assign(emptyDataset, stats.totals)
        stats.lastChange = Object.assign(emptyDataset, stats.totals)

        if (opts.hasOwnProperty('initialTotals')) stats.totals = opts.initialTotals

        this.cache = Object.assign(emptyDataset, this.cache)
        this.startDate = new Date()
    }

    /**
     * Initialization (connects, sets channel, starts process)
     */
    init() {
        // Create instance of Discord Client
        this.instance = new Discord.Client()

        // Connect to Discord
        this.instance.login(this.opts.apiKey)

        // On connection start process
        this.instance.on('ready', () => {
            // Get channel key to use
            this.channel = this.instance.channels.get(this.opts.channelKey)

            // Start checking Kickstarter status
            this.startPolling()
        })
    }

    /**
     * Starts the polling process that will fetch data and update the message
     */
    startPolling() {
        // Run first poll
        this.fetchData().then(()=>{
            // Start interval
            this.pollerInterval = setInterval(()=>{
                firstRun = false
                this.fetchData.bind(this)
            }, this.opts.pollRate * 60000)
        })
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Stops the polling process
     */
    stopPolling() {
        clearInterval(this.pollerInterval)
        this.pollerInterval = null
    }

    /**
     * Fetches the latest data, if they are different than last, it will post the new data
     * @returns {Promise<void>}
     */
    async fetchData() {
        // Create the API URI
        const URL = `https://www.kickstarter.com/projects/${this.opts.campaign}/stats.json?v=1`

        // Actually fetch the data
        let fetchedResp = await fetch(URL)
        let fetchedData = await fetchedResp.json()

        // Post in discord
        if (!fetchedData.hasOwnProperty('project')) {
            throw `Erroneous data received`
        }

        // Check if we need to reset
        if (this.opts.resetDaily) {
            let now = new Date()
            if (now.getDate()!==this.startDate.getDate()) {
                stats = {
                    totals : {
                        pledged: 0,
                        backers_count: 0,
                        comments_count: 0
                    },
                    lastChange : {
                        pledged: Number(fetchedData.project.pledged),
                        backers_count: fetchedData.project.backers_count,
                        comments_count: fetchedData.project.comments_count
                    }
                }
            }
        }

        // Small fix for String data
        fetchedData.project.pledged = Number(fetchedData.project.pledged)

        // Go through the posting process
        this.postLatestStatus(fetchedData.project).then(()=>{
            this.cache = fetchedData.project
        })
    }

    /**
     * Will post the latest data in a message on discord
     * @param fetchedData
     * @param fetchedData.pledged
     * @param fetchedData.backers_count
     * @param fetchedData.comments_count
     */
    async postLatestStatus(fetchedData) {
        // Create the message
        let message = this.createMessage(fetchedData)

        // Send to Discord
        if (this.opts.notifyOnChange) {
            // Delete last message (if any)
            this.deleteLastMessage().then(() => {
                // Post new message
                this.channel.send(message)
            })
        } else {
            // Edit message (if exists, otherwise post new)
            this.editMessage(message)
        }
    }

    deleteLastMessage() {
        // Get messages from channel (limit 1)
        return this.channel.fetchMessages({limit: 1}).then(messages => {
            // Get last message
            let lastMessage = messages.first()

            // Delete last message if it's from the bot
            if (lastMessage.author.bot) {
                return lastMessage.delete()
            }
        })
    }

    editMessage(message) {
        // Get messages from channel (limit 1)
        return this.channel.fetchMessages({limit: 1}).then(messages => {
            // Get last message
            let lastMessage = messages.first()

            // Edit last message if it is indeed from the bot, otherwise send new
            if (lastMessage.author.bot) {
                return lastMessage.edit(message)
            } else {
                return this.channel.send(message)
            }
        })
    }

    tallyChanges(fetchedData) {
        // No need totally anything on first run
        if (firstRun) return

        // Get if data changed
        const dataChanged = ((JSON.stringify(fetchedData)) !== (JSON.stringify(this.cache)))

        if (dataChanged) {
            // Set last changed values
            stats.lastChange.pledged = fetchedData.pledged
            stats.lastChange.backers_count =  fetchedData.backers_count
            stats.lastChange.comments_count =  fetchedData.comments_count

            // Set total changed values
            stats.totals.pledged += fetchedData.pledged - stats.lastChange.pledged
            stats.totals.backers_count += (fetchedData.backers_count - stats.lastChange.backers_count)
            stats.totals.comments_count += (fetchedData.comments_count - stats.lastChange.comments_count)
        }
    }

    createTimestamp(fetchedData) {
        // Get if data changed
        let dataChanged = (fetchedData.pledged !== this.cache.pledged)
        dataChanged = (dataChanged || (fetchedData.backers_count !== this.cache.backers_count))

        // Current time
        const timeDate = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // If data changed, update last change time
        if (dataChanged) {
            lastChangedTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        }

        return `*Last changed on: ${lastChangedTime}* (GMT+2)
*Last checked on: ${timeDate}* (GMT+2)\n`
    }

    static createLastChangeText(fetchedData) {
        // Create status messages
        const pledgeText = ksDiscordBot.emotesFromNum(fetchedData.pledged)
        const backerText = ksDiscordBot.emotesFromNum(fetchedData.backers_count)
        const commentText = ksDiscordBot.emotesFromNum(fetchedData.comments_count)

        // Difference values
        let pledgedDiff,backersDiff
        let pledgedDiffText, backersDiffText

        // Calculate difference values if not first run
        if (!firstRun) {
            pledgedDiff = fetchedData.pledged - stats.lastChange.pledged
            backersDiff = fetchedData.backers_count - stats.lastChange.backers_count

            // Create text for differences
            pledgedDiffText = `(${((pledgedDiff<=0?"":"+") + pledgedDiff)})`
            backersDiffText = `(${((backersDiff<=0?"":"+") + backersDiff)})`
        }

        return `
Pledged Total:  ${pledgeText}  :moneybag: ${pledgedDiff?('*'+pledgedDiffText+'*'):''} \n
Backers:            ${backerText}  :scream: ${backersDiff?('*'+backersDiffText+'*'):''}\n
Comments:      ${commentText}  :scream_cat: \n
`
    }

    static createTotalChangeText() {
        // Return totals since last reset
        return `
Total amount pledged today:  +${ksDiscordBot.emotesFromNum(stats.totals.pledged)} :moneybag: \n
Number of new backers today: +${ksDiscordBot.emotesFromNum(stats.totals.backers_count)} :scream: \n
`
    }

    /**
     * Creates the formatted message for the kickstarter status
     * @returns {string}
     */
    createMessage(fetchedData) {
        // Calculate totals / last change from new data
        this.tallyChanges(fetchedData)

        // Create percentage if exists
        let fundedPercentage = ''

        if (this.opts.goal) {
            fundedPercentage = `${((fetchedData.pledged / this.opts.goal) * 100).toFixed(2)}% funded`
        }

        // Start creating the message ( title first )
        let discordMessage = `__Kickstarter Campaign ${fundedPercentage}:__\n`

        // Create accordingly to what option is set (Totals or Last change)
        if (this.opts.showTotalChange) {
            discordMessage += ksDiscordBot.createTotalChangeText()
        } else {
            discordMessage += ksDiscordBot.createLastChangeText(fetchedData)
        }

        // Add timestamp
        discordMessage += this.createTimestamp(fetchedData)

        // Add campaign link
        if (this.opts.showLink) {
            discordMessage += `
Visit the Kickstarter page for more accurate stats ( and sweet traffic ):
https://www.kickstarter.com/projects/${this.opts.campaign}`
        }

        return discordMessage
    }

    /**
     * Will create an emote number using any number given
     * @param num
     * @returns {string|string}
     */
    static emotesFromNum(num) {
        const emotes = [':zero:', ':one:', ':two:', ':three:', ':four:', ':five:', ':six:', ':seven:', ':eight:', ':nine:']
        let numText = String(num.toFixed(0))
        let emotesText = ''

        for (let ch of numText) {
            emotesText += emotes[ch]
        }

        return emotesText
    }

}

module.exports = ksDiscordBot