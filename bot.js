const {
    Client,
    IntentsBitField,
    Events,
    ActivityType,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    Colors,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js')

const bot = new Client({
    intents: new IntentsBitField(3276799),
    partials: [
        "CHANNEL",
        "GUILD_MEMBER",
        "GUILD_SCHEDULED_EVENT",
        "MESSAGE",
        "REACTION",
        "USER",
    ]
});

const {QuickDB,JSONDriver} = require('quick.db');
const db = new QuickDB({driver: new JSONDriver()})

require('dotenv').config()

bot.on(Events.ClientReady,()=>{
    bot.user.setActivity({
        type:ActivityType.Watching,
        name:'Wars'
    })
})

bot.on(Events.MessageCreate, async(msg)=> {
    if (msg.author.bot) return;
    if (!msg.content.toLowerCase().startsWith('lc')) return;
    
    let content = msg.content.toLowerCase()
    if (content == "lc war") {
        let warInfo = await db.get('war')
        if (warInfo) {
            if (warInfo.isGoing) {
                return await msg.reply('Theres already a war going on, try again later.')
            }
        }
        await msg.reply(`A war started in <#1120432470408564797>`);
        let embed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setTitle('⚠️ WAR ALERT ⚠️')
        .setImage('https://media.tenor.com/3oowMV07R_cAAAAC/spartans-sparta.gif')
        .setTimestamp(new Date())
        
        let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🚪')
            .setLabel('Participate')
            .setCustomId('participate'),
            new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🤚')
            .setLabel('End')
            .setCustomId('end')
        )

        let channel = await msg.guild.channels.cache.get("1120432470408564797")

        let m = await channel.send({content:`${msg.author} called war!`,embeds:[embed],components:[row]});
        await db.set('war', {
            isGoing: true,
            calledBy: msg.author.id,
            warMessage: m.id,
            participants: []
        })
        await channel.permissionOverwrites.edit(msg.author.id,{SendMessages: true})
        await channel.permissionOverwrites.edit("851417369989087283",{SendMessages: true})
    }
})

bot.on(Events.InteractionCreate, async (i) => {
    if (i.isButton()) {
        if (i.customId.toLowerCase() == "participate") {
            let info = await db.get('war')
            if (!info || !info.isGoing)  return await i.reply({content:'Theres no on-going war',ephemeral:true});
            if (info.participants.includes(i.user.id)) return await i.reply({content:'You\'ve already participated.',ephemeral:true});
            if (info.calledBy == i.user.id) return await i.reply({content:'You\'ve called this war, so you can\'t participate.',ephemeral:true});
            await db.push('war.participants',i.user.id)
            if (i.replied) {
                await i.followUp({content:`${i.user} participated.`})  
            } else {
                await i.reply({content:`${i.user} participated.`})
            }
            
        } else if (i.customId.toLowerCase() == "end") {
            let info = await db.get('war')
            if (!info || !info.isGoing)  return await i.reply({content:'Theres no on-going war',ephemeral:true});

            if (i.member.roles.cache.has("851417369989087283")) {

            } else if (info.calledBy != i.member.user.id) {

            } else {
                return await i.reply({content:'Only a staff member or the person who called war can end it.',ephemeral:true});
            }

            let participants = []

            await info.participants.forEach(async id => {
                let memInfo
                try {
                    memInfo = await i.guild.members.fetch(id)
                } catch(Er) { }

                if (memInfo) {
                    participants.push(`${memInfo} | **${memInfo.user.displayName}** (${memInfo.user.username}) [\`${memInfo.user.id}\`]`)
                }
            })

            let embedLog = new EmbedBuilder()
            .setColor(Colors.Yellow)
            .addFields(
                {
                    name:'Called By',
                    value: `<@${info.calledBy}> (\`${info.calledBy}\`)`
                },
                {
                    name:'Ended By',
                    value: `<@${i.user.id}> (\`${i.user.id}\`)`
                },
                {
                    name:'Participated',
                    value: `${info.participants.length}`
                },
                {
                    name:'Participants',
                    value: `${participants.length > 0 ? participants.join('\n') : 'No one participated'}`
                }
            )

            if (!i.replied) {
                await i.reply({content:'Ended war',ephemeral:true})
            }

            let logsChannel = await i.guild.channels.cache.get('1157310265013047337');
            await logsChannel.send({embeds:[embedLog],components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/channels/${i.guild.id}/1120432470408564797/${info.warMessage}`)
                    .setLabel('Redirect to Message')
                )
            ]})

            let warChannel = await i.guild.channels.cache.get("1120432470408564797")
            await warChannel.permissionOverwrites.edit(i.user.id,{SendMessages:  false})
            await warChannel.permissionOverwrites.edit("851417369989087283",{SendMessages:  false})

            await db.delete('war')

            let message
            try {
                message = await warChannel.messages.fetch(info.warMessage)
            } catch(er) {}
            if (message) {
                await message.edit({
                    embeds:[
                        new EmbedBuilder()
                        .setColor(Colors.Yellow)
                        .setDescription(`## ENDED\nCalled by <@${info.calledBy}>\n*${info.participants.length} participated*\n\nThank you for joining!`)
                        .setImage('https://media1.giphy.com/media/PCFK39ruKPdnc4Km4h/giphy.gif?cid=6c09b952guspcqqqxlx91mdvz124xbjxg8hupdj8t450bnj7&ep=v1_internal_gif_by_id&rid=giphy.gif&ct=g')
                    ],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                        .setCustomId('participate')
                        .setLabel('Participate')
                        .setEmoji('🚪'),
                        new ButtonBuilder()
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                        .setCustomId('end')
                        .setLabel('End')
                        .setEmoji('🤚')
                    )]
                })
            }
        }
    }
})

bot.login(process.env.TOKEN)