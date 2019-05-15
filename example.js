const ksDiscordBot = require('ksDiscordBot')

let myksDiscordBot = new ksDiscordBot({
    apiKey :'NTduMmmyKeyDummyKeyNTduMmmyKeyDummyKeyNTduMmmyKeyDummyKeyReplace', // Discord API key
    channelKey : '412312435223', // Channel ID, right click on your special channel and copy ID, then paste here
    campaign: 'sergiucraitoiu/unbound-worlds-apart', // The kickstarter project (it's part of the URL),
    goal : 25000, // Optional: The goal of the kickstarter campaign, it will add a percentage on the message
    forceNewMessage: true,
    pollRate : 15, // Optional: Every how many minutes for the bot to update / recheck the status
    notifyOnChange : false,
    resetDaily : false,
    showLink : false,
    showTotalChange: false,
    showLastChange: true,
    initialData : {
        pledged : 0,
        backers_count : 0,
        comments_count: 0
    }
})

myksDiscordBot.init()