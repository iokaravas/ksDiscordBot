const ksDiscordBot = require('ksDiscordBot')

let myksDiscordBot = new ksDiscordBot({
    apiKey : 'NTduMmmyKeyDummyKeyNTduMmmyKeyDummyKeyNTduMmmyKeyDummyKeyReplace', // Discord API key
    channel: '412312435223', // Channel ID, right click on your special channel and copy ID, then paste here
    goal: 25000, // Optional: The goal of the kickstarter campaign, it will add a percentage on the message
    pollrate: 1, // Optional: Every how many minutes for the bot to update / recheck the status
    campaign: 'sergiucraitoiu/unbound-worlds-apart' // The kickstarter project (it's part of the URL)
})

myksDiscordBot.init()