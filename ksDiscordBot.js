const Discord = require('discord.js')
const fetch = require('node-fetch')

// Event Emitter for logging
const EventEmitter = require('events')
let eventEmitter = new EventEmitter();

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
let cleanRun = true
let lastChangedTime

// ksDiscordBot!
class ksDiscordBot {

    resetInitCounters() {
        stats.totals = Object.assign({}, emptyDataset)
        stats.lastChange = Object.assign({}, emptyDataset)
        this.cache = Object.assign({}, emptyDataset)
        this.startDate = new Date()
        cleanRun = true
    }

    constructor(opts = {}) {
        // Set default parameters
        this.opts = Object.assign(defaultOpts, opts)

        // Check for required parameters
        if (!(this.opts.apiKey && this.opts.channelKey && this.opts.campaign)) {
            throw `Cannot initialize with no Discord API KEY and target campaign/channel`
        }

        // Initialization of counters
        this.resetInitCounters()
        if ('initialTotals' in opts) {
            stats.totals =  Object.assign({}, opts.initialTotals)
        }
    }

    static log(message, notify = false) {
        eventEmitter.emit('log',message)
        if (notify) {
            eventEmitter.emit('notify',message)
        }
    }

    on(e,f) {
        return eventEmitter.on(e,f)
    }

    /**
     * Initialization (connects, sets channel, starts process)
     */
    async init() {

        // Create instance of Discord Client
        this.instance = new Discord.Client()

        // Connect to Discord
        this.instance.login(this.opts.apiKey).then(()=>{

        })

        if ('initialTotals' in this.opts) {
            ksDiscordBot.log(`Preset Totals: Pledges | Backers | Comments`)
            ksDiscordBot.log(`+${stats.totals.pledged} | +${stats.totals.backers_count} | +${stats.totals.comments_count}`)
        }

        // On connection start process
        this.instance.on('ready', () => {
            // Get channel key to use
            this.channel = this.instance.channels.get(this.opts.channelKey)

            // Start checking Kickstarter status
            ksDiscordBot.log(`Started polling`)
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
            this.pollerInterval = setInterval(this.fetchData.bind(this), this.opts.pollRate * 60000)
        })
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Stops the polling process
     */
    stopPolling() {
        clearInterval(this.pollerInterval)
        this.pollerInterval = null
        ksDiscordBot.log(`Stopped polling`)
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

        // Validate & Rectify data
        if (!fetchedData.hasOwnProperty('project')) {
            throw `Erroneous data received`
        }
        // Small fix for String data
        fetchedData.project.pledged = Number(fetchedData.project.pledged)

        // Logging
        ksDiscordBot.log(`Fetched Data: Pledges | Backers | Comments`)
        ksDiscordBot.log(`${fetchedData.project.pledged} | ${fetchedData.project.backers_count} | ${fetchedData.project.comments_count}`)

        // Check if we need to reset
        if (this.opts.resetDaily && (new Date().getDate() !== this.startDate.getDate())) {
            ksDiscordBot.log('Daily reset triggered')
            this.resetInitCounters()
        }

        // Go through the posting process
        this.postLatestStatus(fetchedData.project).then(()=>{
            this.cache = fetchedData.project // Update cache
            cleanRun = false
            ksDiscordBot.log(`Message was updated`)
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
        // No need to tally anything on clean slate run
        if (cleanRun) {
            return
        }

        // Get if data changed
        const dataChanged = ((JSON.stringify(fetchedData)) !== (JSON.stringify(this.cache)))

        if (dataChanged) {
            // Set last changed values
            stats.lastChange.pledged = fetchedData.pledged - this.cache.pledged
            stats.lastChange.backers_count = fetchedData.backers_count - this.cache.backers_count
            stats.lastChange.comments_count = fetchedData.comments_count - this.cache.comments_count

            ksDiscordBot.log(`> New change: Pledges | Backers | Comments`, true)
            ksDiscordBot.log(`${stats.lastChange.pledged} | ${stats.lastChange.backers_count} | ${stats.lastChange.comments_count}`, true)

            // Set total changed values
            stats.totals.pledged += stats.lastChange.pledged
            stats.totals.backers_count += stats.lastChange.backers_count
            stats.totals.comments_count += stats.lastChange.comments_count

            ksDiscordBot.log(`> New totals: Pledges | Backers | Comments`, true)
            ksDiscordBot.log(`${stats.totals.pledged} | ${stats.totals.backers_count} | ${stats.totals.comments_count}`, true)
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

        // Difference
        let pledgedDiffText, backersDiffText
        let pledgeSign = '+'
        let backersSign = '+'

        // Calculate difference values if not first run
        if (!cleanRun) {

            // Create text for differences
            pledgedDiffText = `(${stats.lastChange.pledged})`
            backersDiffText = `(${stats.lastChange.backers_count} )`
        }

        return `
Pledged Total:  ${pledgeText}  :moneybag: ${stats.lastChange.pledged!==0?('*'+pledgedDiffText+'*'):''} \n
Backers:            ${backerText}  :scream: ${stats.lastChange.backers_count!==0?('*'+backersDiffText+'*'):''}\n
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

        // If we have a Goal, add the percentage
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
        let numText = String(num.toFixed(0)) // We can't emote '.'
        let emotesText = ''

        for (let ch of numText) {
            if (ch === '-') {
                emotesText += '-'
                continue
            }
            emotesText += emotes[ch]
        }

        if (numText[0]!=='-') {
            emotesText = `+${emotesText}`
        }

        return emotesText
    }

    pm(userID, message) {
        this.instance.fetchUser(userID).then((user)=>{
            user.sendMessage(message)
        })
    }

}

module.exports = ksDiscordBot