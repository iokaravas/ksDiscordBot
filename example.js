const ksDiscordBot = require('ksdiscordbot')

let myksDiscordBot = new ksDiscordBot({
    apiKey :'SAFGJJ252IHDGHDHGOIOSIDFASDG-ASDGWETD.G5123hFGSAdsfsageASD0', // Discord API key
    channelKey : '3423423523423423', // Channel ID, right click on your special channel and copy ID, then paste here
    campaign: 'sergiucraitoiu/unbound-worlds-apart', // The kickstarter project (it's part of the URL),
    goal : 25000, // Optional: The goal of the kickstarter campaign, it will add a percentage on the message
    pollRate : 15, // Optional: Every how many minutes for the bot to update / recheck the status
    notifyOnChange : false,
    resetDaily : true,
    showLink : true,
    showTotalChange: false,
    initialTotals : {
        pledged : 0,
        backers_count : 0,
        comments_count: 0
    }
})

// logging handler
let logger = (message) => {
    console.log(`[${new Date().toLocaleString()}] ${message}`)
}

// Bind event handler for logging
myksDiscordBot.on('log',logger)

// Start process
myksDiscordBot.init()
