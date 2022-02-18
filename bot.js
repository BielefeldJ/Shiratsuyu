const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');
const proc = require('process');
const HealthcheckServer = require('ipc-healthcheck/healthcheck-server');

const notifyChannel = '927873942440509440';
//Discord client stuff
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.login(token);

//healthcheck stuff
const healthcheck = new HealthcheckServer('twitchbots',100,5000,true);

healthcheck.on('serviceCrashed', service => {
	client.channels.fetch(notifyChannel).then(channel => {
		channel.send(`Umm.. <@553693650882920468>..  ${service.name} doesn't answer me anymore o((>ω< ))o Can you check whats wrong there? Thank you ❤️`);
	});
});

healthcheck.on('serviceNotify', (err,service) => {
	client.channels.fetch(notifyChannel).then(channel => {
		channel.send(`${service.name} told me, that there was an error. I hope ${service.name} is still okay tho 😟. Let me forward it to you <@553693650882920468>:`);
		channel.send('```' + err + '```');
	});
});

healthcheck.on('serviceRegistered', service => {
	client.channels.fetch(notifyChannel).then(channel => {
		channel.send(`${service.name} is now online ^-^.`);
	});
});

//start healthcheck server
healthcheck.startServer();

proc.on('uncaughtException', function(err) {
	client.channels.fetch(notifyChannel).then(channel => {
		channel.send("<@553693650882920468> I'm sorry, b.. but I made a mistake. o((>ω< ))o  Can you please take a look at this? ＞﹏＜");
		channel.send('``` ' + err.stack + '```');
		console.error(err);
	});
  });

