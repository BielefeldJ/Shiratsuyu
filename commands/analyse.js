const { SlashCommandBuilder } = require('@discordjs/builders');
const shell = require('shelljs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('analyse')
		.setDescription('Analyse the chat of a twitch VOD')
		.addStringOption(option => option.setName('url').setDescription('The URL of the twitch VOD').setRequired(true))
		.addStringOption(option => option.setName('emoteprefix').setDescription('Prefix that the emotes use. To get more info about used emotes')),
	async execute(interaction) {
		const url = interaction.options.getString('url');	
		const emoteprefix = interaction.options.getString('emoteprefix');

		if(url.startsWith("https://www.twitch.tv/") || url.startsWith("www.twitch.tv/") || url.startsWith("https://twitch.tv/"))	
		{
			const parts = url.split('/');
			const vodId = parts.at(-1);
			if(isNAN(parseInt(vodId)))
			{
				await interaction.reply(`I didn't found a valid VOD ID there.. Sorry 😥 I only found this. ${vodId}`);
				return;
			}
			await interaction.reply(`I'm reading chat now. Please give ma a few seconds. :eyeglasses: :hourglass_flowing_sand: `);
			const chatlog = await JSON.parse(shell.exec(`twitch-chatlog ${vodId} -raw -l 0`, {silent:true}).stdout);

			var user={};
			var emotecount=0;
			var modmsgcount=0, botcount=0;
			var subs={};subgifts={};
			var channelemotes={};
			var bitsspent={};
			chatlog.forEach(message =>{
				//count emotes
				if(message["message"]["emoticons"])
					emotecount+= message["message"]["emoticons"].length;

				if(emoteprefix)
				{		
					//count ikus emotes	
					//I'm using regex for this, because twitch emote id system is kinda weird
					let emoteregx = new RegExp(emoteprefix + '[A-Z][a-zA-Z0-9]'); //emotes use the same prefix followed by a capital letter. example: ikusouSax 

					if(message["message"]["fragments"]) //message is split into fragments. Every emote has an one fragment
					{
						message["message"]["fragments"].forEach(frag => {	

							if(frag["emoticon"])
							{
								let emote = frag["text"];
								if(emoteregx.test(emote))
								{
									if(channelemotes.hasOwnProperty(emote))
									channelemotes[emote]++;
									else
									channelemotes[emote]=1;
								}
							}
						});
					}
					//ikusouFUNK ikusouHorn ikusouSax ikusouDrums ikusouHappy ikusouHat ikusouL ikusouLady ikusouMJ ikusouDenka ikusouClassic ikusouFuji ikusouSamurai ikusouKampai ikusouFlower ikusouJ5 ikusouDDYUKA
				}
				//count messages from mods
				if(message["message"]["user_badges"] && message["message"]["user_badges"][0]["_id"] === "moderator")
					modmsgcount++;

				//StreamElements count
				if(message["commenter"]["name"]==="streamelements")
					botcount++;
				
				//count user
				username = message["commenter"]["name"]
				if(user.hasOwnProperty(username))
					user[username]++;
				else
					user[username] = 1;

				if(message["message"]["bits_spent"])
				{
					if(bitsspent.hasOwnProperty(username))
						bitsspent[username]+=message["message"]["bits_spent"];
					else
						bitsspent[username]=message["message"]["bits_spent"];
				}		

				//count subs
				if(message["message"]["user_notice_params"]["msg-id"])
				{
					
					let msgid = message["message"]["user_notice_params"]["msg-id"];
					if(msgid === "subgift")
					{
						if(subgifts.hasOwnProperty(username))
							subgifts[username]+=parseInt(message["message"]["user_notice_params"]["msg-param-gift-months"]);
						else
							subgifts[username]=parseInt(message["message"]["user_notice_params"]["msg-param-gift-months"]);
					}
					else if(msgid==="resub" || msgid==="sub")
					{
						if(subs.hasOwnProperty(username))
							subs[username]+=1;
						else
							subs[username]=1;
					}
				}
			});

			//sort all arrays
			const topchatter = Object.entries(user).sort(([,a],[,b]) => b-a); //sort top chatter
			const sortedsubgifts = Object.entries(subgifts).sort(([,a],[,b]) => b-a); //sort subgifters
			const sortedsubs = Object.entries(subs).sort(([,a],[,b]) => b-a);			
			const sortedbits = Object.entries(bitsspent).sort(([,a],[,b]) => b-a);

			//var channelemotecount;
			if(emoteprefix)
			{
				var sortedemotes = Object.entries(channelemotes).sort(([,a],[,b]) => b-a);
				if(sortedemotes && sortedemotes.length)
					var channelemotecount = sortedemotes.map(function(v) { return v[1] }).reduce(function(a,b) { return a + b });  // sum only the seccond part of the array
			}

			if(sortedbits && sortedbits.length)			
				var bitstotal = sortedbits.map(function(v) { return v[1] }).reduce(function(a,b) { return a + b });  // sum only the seccond part of the array
			if(sortedsubs && sortedsubs.length)
				var totalsubs = sortedsubs.map(function(v) { return v[1] }).reduce(function(a,b) { return a + b });  // sum only the seccond part of the array
			if(sortedsubgifts && sortedsubgifts.length)
				var totalgiftsubs = sortedsubgifts.map(function(v) { return v[1] }).reduce(function(a,b) { return a + b });  // sum only the seccond part of the array
			
			function parse(x)
			{
				const parsed = parseInt(x);
				if (isNaN(parsed)) { return 0; }
				return parsed;
			}
			let answer='```';
			answer+=`=============== CHAT ===============\n`;
			answer+=`In total, there were ${topchatter.length} different user in chat. The top 5 user today:\n`;
			for(let i=0;i<5;i++)
				answer+=`\t ${i+1}: ${topchatter[i][0]} with a total of ${topchatter[i][1]} messages.\n`;
			answer+=`There were ${modmsgcount} messages send by a mod. ${botcount} of them were send by StreamElements\n\n`;
			//emotes
			answer+=`=============== EMOTES ===============\n`;
			answer+=`In all ${chatlog.length} messages, ${emotecount} emotes were used.\n`;
			if(emoteprefix)
			{
				answer+=`${channelemotecount} of them were ikus emotes. The top 5 of ikus emote were:\n`;
				for(let i=0;i<5;i++)
					answer+=`\t ${i+1}: Emote ${sortedemotes[i][0]} was used ${sortedemotes[i][1]} times.\n`;
			}

			//subs
			answer+=`\n=============== SUBS ===============\n`
			answer+=`There were a total of ${parse(totalsubs)+parse(totalgiftsubs)} subs today. ${parse(totalgiftsubs)} of them were gift subs.\n`;
			answer+=`In total, ${sortedsubgifts.length} user gifted subs today. The top 5 gifters are: \n`;
			for(let i=0;i<5;i++)
			{	
				if(i>=sortedsubgifts.length)
					break;
				answer+=`\t ${i+1}: ${sortedsubgifts[i][0]} with a total of ${sortedsubgifts[i][1]} giftsubs.\n`;
			}
			//Bits			
			answer+="\n=============== BITS ===============\n";
			answer+=`In total, there were ${parse(bitstotal)} Bits spend on this stream.\n`;
			answer+=`${sortedbits.length} user used bits today. The top 5 are:\n`;
			for(let i=0;i<5;i++)
			{	
				if(i>=sortedbits.length)
					break;
				answer+=`\t ${i+1}: ${sortedbits[i][0]} with a total of ${sortedbits[i][1]} Bits.\n`;
			}
			answer+='```';
			return interaction.editReply("Okay, I'm done reading. Here are your requested stats for the stream with id \""+ vodId + "\": \n " + answer);
		}
		return interaction.reply(`Invalid VOD link.`);
	},
};