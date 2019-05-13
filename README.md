# ksDiscordBot

A Discord Bot as a [Node](http://nodejs.org/) module, that will join a specific channel and start posting a kickstarter
campaign status. This was made initially for Kickstarter project [Unbound: World's Apart](https://www.kickstarter.com/projects/sergiucraitoiu/unbound-worlds-apart) - Have a look it's a great game ;)

Please note that this is a personal side project I work on, during my free time.
I may use weird/uncommon ways of doing stuff just for learning purposes.
As it stands though, the software is fully functional and I'm pushing only working prototypes.

If you wish you can always drop me a line with suggestions/issues in [issues](https://github.com/iokaravas/ksDiscordBot/issues) or at [@karavas](https://twitter.com/karavas).

### Dependencies

ksDiscordBot has the following dependencies:
- [discordjs](https://www.npmjs.com/package/discord.js)
- [node-fetch](https://www.npmjs.com/package/node-fetch)

### Quick Start
You can install this module using [npm](http://github.com/isaacs/npm):

`npm install https://github.com/iokaravas/ksDiscordBot.git --save`

### Example usage (example.js)

You need to get an API key for your bot, and add your bot to your server [you can read more about this here.](https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/)
You also need to create a specific channel for the bot, and assign the bot a role that has access to message that channel.
The bot was developed keeping in mind that the channel will always be empty, otherwise it may not delete previous messages properly.

![This is an example output of the bot](example_output.png?raw=true "This is an example output of the bot")

```js
const ksDiscordBot = require('ksDiscordBot')

let myksDiscordBot = new ksDiscordBot({
    apiKey : 'NTduMmmyKeyDummyKeyNTduMmmyKeyDummyKeyNTduMmmyKeyDummyKeyReplace', // Discord API key
    channel: '412312435223', // Channel ID, right click on your special channel and copy ID, then paste here
    goal: 25000, // Optional: The goal of the kickstarter campaign, it will add a percentage on the message
    pollrate: 1, // Optional: Every how many minutes for the bot to update / recheck the status
    campaign: 'sergiucraitoiu/unbound-worlds-apart' // The kickstarter project (it's part of the URL)
})

myksDiscordBot.init()
```

### Authors

* **Ioannis (John) Karavas** - *Initial work* - [iokaravas](https://github.com/iokaravas)

See also the list of [contributors](https://github.com/ksDiscordBot/contributors) who participated in this project.

****DISCLAIMER:****

There is no logging or error handling yet, Bot will just error out, although it's not common occurance.

I created this because I wanted to help out the guys in [their Kickstarter campaign](https://www.kickstarter.com/projects/sergiucraitoiu/unbound-worlds-apart) - Have a look it's a great game ;)

***The software is provided AS-IS.***

### TODO
Several things could be added and/or improved, including :
* Better checks on the constructor
* Handle specific errors that may occur, although you still can catch what is thrown currently
* Logging of events
* Handle even more Kickstarter related stuff
* Better customization
