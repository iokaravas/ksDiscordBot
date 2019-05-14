const Discord = require('discord.js')
const fetch = require('node-fetch')

// Defaults
_DEF_POLLRATE = 30

// ksDiscordBot!
class ksDiscordBot {

    constructor(opts) {
        // Set options
        this.apiKey = opts.apiKey
        this.channelKey = opts.channel
        this.goal = opts.goal
        this.pollrate = opts.pollrate
        this.campaign = opts.campaign

        if (!(this.apiKey && this.channelKey && this.campaign)) {
            throw `Cannot initialize with no Discord API KEY and target campaign/channel`
        }

        if (!this.pollrate) {
            this.pollrate = _DEF_POLLRATE
        }

        this.cache = null // Local cache
    }

    /**
     * Initialization (connects, sets channel, starts process)
     */
    init() {
        // Create instance of Discord Client
        this.instance = new Discord.Client()

        // Connect to Discord
        this.instance.login(this.apiKey)

        // On connection start process
        this.instance.on('ready', () => {
            // Get channel key to use
            this.channel = this.instance.channels.get(this.channelKey)

            // Start checking kickstarter status
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
            this.pollerInterval = setInterval(this.fetchData.bind(this), this.pollrate * 60000)
        })
    }

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
        const URL = `https://www.kickstarter.com/projects/${this.campaign}/stats.json?v=1`

        // Actually fetch the data
        let fetchedResp = await fetch(URL)
        let fetchedData = await fetchedResp.json()

        // Post in discord
        if (!fetchedData.hasOwnProperty('project')) {
            throw `Erroneous data received`
        }

        this.postLatestStatus(fetchedData.project)
    }

    /**
     * Will post the latest data in a message on discord
     */
    postLatestStatus(fetchedData) {
        // Get if data changed
        let dataChanged = ((JSON.stringify(fetchedData)) !== (JSON.stringify(this.cache)))

        if (this.cache) {
            dataChanged = (fetchedData.pledged!==this.cache.pledged)
            dataChanged = (dataChanged || (fetchedData.backers_count!==this.cache.backers_count))
        }

        // Create the message
        let message = this.createMessage(fetchedData)

        // Get last message in channel and update or re-create accordingly
        this.channel.fetchMessages({limit: 1}).then(messages => {
            // Get last message
            let lastMessage = messages.first();

            if (lastMessage.author.bot) { // Small failsafe
                if (dataChanged) {
                    // If data changed, it'll re-post to force "unread" to channel
                    lastMessage.delete().then(() => {
                        this.channel.send(message)
                    })
                } else {
                    // If no data were changed, will only update the lasted checked time
                    lastMessage.edit(message)
                }
            } else {
                this.channel.send(message)
            }

        })

        this.cache = fetchedData
    }

    /**
     * Creates the formatted message for the kickstarter status
     * @returns {string}
     */
    createMessage(fetchedData) {
        // Get if data changed
        const dataChanged = ((JSON.stringify(fetchedData)) !== (JSON.stringify(this.cache)))

        // Create status messages
        const pledgeText = ksDiscordBot.emotesFromNum(fetchedData.pledged)
        const backerText = ksDiscordBot.emotesFromNum(fetchedData.backers_count)
        const commentText = ksDiscordBot.emotesFromNum(fetchedData.comments_count)

        // Difference values
        let pledgedDiff,backersDiff
        let pledgedDiffText, backersDiffText

        // Create percentage if exists
        let fundedPercentage = ''

        if (this.goal) {
            fundedPercentage = `${((fetchedData.pledged / this.goal) * 100).toFixed(2)}% funded`
        }

        const timeDate = new Date().toLocaleString()

        // If data changed
        if (dataChanged) {
            this.lastChangeTime = new Date().toLocaleString()

            // Update last values
            if (this.cache) {
                this.lastPledged = this.cache.pledged.split('.')[0]
                this.lastBackers_count = this.cache.backers_count
            } else {
                this.lastPledged = fetchedData.pledged
                this.lastBackers_count = fetchedData.backers_count
            }

            // Calculate difference values
            pledgedDiff = this.lastPledged - fetchedData.pledged
            backersDiff = this.lastBackers_count - fetchedData.backers_count

            // Create text for differences
            pledgedDiffText = `(${(pledgedDiff<=0?"":"+") + pledgedDiff})`
            backersDiffText = `(${(backersDiff<=0?"":"+") + backersDiff})`
        }

        return `__Kickstarter Campaign ${fundedPercentage}:__\n
Pledged Total:  ${pledgeText}  :moneybag: *${pledgedDiff!==0?pledgedDiffText:''}* \n
Backers:            ${backerText}  :scream: *${backersDiff!==0?backersDiffText:''}*\n
Comments:      ${commentText}  :scream_cat: \n
*Last changed on: ${this.lastChangeTime}* (GMT+2)
*Last checked on: ${timeDate}* (GMT+2)`
    }

    /**
     * Will create an emote number using any number given
     * @param num
     * @returns {string|string}
     */
    static emotesFromNum(num) {
        const emotes = [':zero:', ':one:', ':two:', ':three:', ':four:', ':five:', ':six:', ':seven:', ':eight:', ':nine:']
        let numText = (num + '').split('.')[0]
        let emotesText = ''

        for (let ch of numText) {
            emotesText += emotes[ch]
        }

        return emotesText
    }

}

module.exports = ksDiscordBot