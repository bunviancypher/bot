const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, ActivityType, ChannelType } = require('discord.js');
require('dotenv').config();

// Timezone offset (UTC+7)
const LOCAL_TZ_OFFSET = 7 * 60 * 60 * 1000;

const lastCommandTimes = new Map();
const lastMessageTime = new Map();
const spamTasks = new Map();
const violations = new Map();

// Forbidden words list
const FORBIDDEN_WORDS = [
    "cái lồn má", 'spam', 'toxic',
    'đĩ', 'đĩ rạc', 'con đĩ', 'đéo', 'địt', 'lồn', 'cặc', 'buồi', 'vãi', 'đụ', 'mẹ mày', 'cha mày', 'ông mày', 'bà mày',
    'con mẹ mày', 'con cha mày', 'thằng điên', 'đồ ngu', 'óc chó', 'thằng khốn', 'con khốn', 'đồ khốn nạn', 'thằng óc',
    'con óc', 'đồ óc', 'thằng ngu', 'con ngu', 'đồ ngu',
    // Variations
    'lon', 'l0n', 'lôn', 'lỏn', 'cac', 'c@c', 'dit', 'dít', 'di', 'dĩ', 'dỉ', 'deo', 'buoi', 'vai', 'du',
    'me may', 'cha may', 'ong may', 'ba may', 'con me may', 'con cha may', 'thang dien', 'do ngu', 'oc cho',
    'thang khon', 'con khon', 'do khon nan', 'thang oc', 'con oc', 'do oc', 'thang ngu', 'con ngu', 'do ngu',
    'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell', 'crap', 'bastard', 'slut', 'whore', 'dick', 'pussy', 'cock', 'ass', 'tits', 'boobs', 'fucker', 'motherfucker',
    'cunt', 'nigger', 'faggot', 'retard',
    // More variations
    'f*ck', 'fuk', 'sh*t', 'b*tch', 'assh*le', 'd*mn', 'h*ll', 'cr*p', 'b*stard', 'sl*t', 'wh*re', 'd*ck', 'p*ssy', 'c*ck', 'a*s', 't*ts', 'b*obs', 'f*cker', 'm*therf*cker', 'c*nt', 'n*gger', 'f*ggot', 'ret*rd'
];

// Colors for embeds
const COLORS = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xF7DC6F, 0xBB8FCE, 0x85C1E2, 0xF8C471, 0xABEBC6];

// GIFs for embeds
const GIFS = {
    fun: [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3phbXQyamNubG03Ymxobm5zbWx5Mmwzcm55dm91MXAxMXoydHdiNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ppSjX2iP9Ec1ExJRsV/giphy.gif',
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3VrcTBqamxsOTYyMWV5dXF1N3VtcGJjYmpiZGNnOHE3c3lxMGI3eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VEzYdo930nTiTuVeMU/giphy.gif'
    ],
    warning: ['https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2F1ZnA0am1nbzh4bXVqbmJ4b2Zrc3RrOXI2cTZqN2oyemR2eXZsciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/zkNBtlymM6zX4DndrU/giphy.gif']
};

// Auto-reply keywords
const GREETINGS = {
    'xin chào': ['Xin chào! 👋', 'Chào bạn! 😊', 'Hello! 🌟', 'Chào cậu nè! 💫'],
    'chào': ['Chào bạn! 👋', 'Hii! 😄', 'Chào cậu! ✨'],
    'hello': ['Hello! 👋', 'Hi there! 😊', 'Chào bạn! 🌟'],
    'hi': ['Hi! 👋', 'Hii! 😄', 'Chào! ✨'],
    'hey': ['Hey! 👋', 'Heyy! 😊', 'Chào bạn! 🌟'],
    'good morning': ['Good morning! ☀️', 'Chào buổi sáng! 🌅', 'Sáng tốt lành! ✨'],
    'chào buổi sáng': ['Chào buổi sáng! ☀️', 'Sáng vui vẻ! 🌅', 'Good morning! ✨'],
    'chúc ngủ ngon': ['Ngủ ngon! 😴', 'Chúc bạn ngủ ngon! 🌙', 'Good night! ⭐'],
    'good night': ['Good night! 🌙', 'Ngủ ngon! 😴', 'Chúc ngủ ngon! ⭐'],
    'cảm ơn': ['Không có gì! 😊', 'Nhỏ! ✨', 'Luôn sẵn sàng giúp đỡ! 💕'],
    'thank you': ['You\'re welcome! 😊', 'Không có gì! ✨', 'Anytime! 💕'],
    'thanks': ['No problem! 😊', 'Nhỏ! ✨', 'You got it! 💕']
};

// Idle messages
const IDLE_MESSAGES = [
    '🤔 Câu hỏi: Nếu bạn có siêu năng lực, bạn muốn có năng lực gì?',
    '🎮 Câu hỏi: Game yêu thích của các bạn là gì?',
    '🍕 Câu hỏi: Pizza hay hamburger? 🍔',
    '🎬 Câu hỏi: Bộ phim nào bạn có thể xem đi xem lại mãi không chán?',
    '🎵 Câu hỏi: Bài hát nào đang làm bạn "nghiện" gần đây?',
    '☕ Câu hỏi: Trà hay cà phê? 🍵',
    '🌍 Câu hỏi: Nếu được du lịch miễn phí, bạn muốn đi đâu?',
    '🎨 Câu hỏi: Màu sắc yêu thích của bạn là gì?',
    '📚 Câu hỏi: Quyển sách cuối cùng bạn đọc là gì?',
    '🍜 Câu hỏi: Món ăn Việt Nam nào bạn thích nhất?',
    '🎯 Fun fact: Bạn có biết rằng con bạch tuộc có 3 trái tim không? 🐙',
    '🌟 Chào mọi người! Server có vẻ yên tĩnh quá nhỉ? 👀',
    '💭 Ai còn thức không? Hãy nói chuyện với mình đi! 😊',
    '🎲 Có ai muốn chơi game không? Dùng `/rps` để chơi oẳn tù tì với mình nè!',
    '🎰 Thử vận may với `/roll` xem sao! 🍀',
    '😴 Server vắng quá... có ai ở đây không? 👻'
];

const IDLE_CHAT_CHANNELS = [1001289611470966849, 1374019654758043760, 1001290076363440200];

// Memes
const MEMES = [
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmo3YjY0NnEwMG90bWU4czU1dmIzNzUxdnliMXB3andkMGZ0cHIxOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LR5GeZFCwDRcpG20PR/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXM3MTZpMW1kbHI0b3F5azVzcXUwazJkYzN2eTM4OG9jbXlvdDAybyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QMHoU66sBXqqLqYvGO/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXM3MTZpMW1kbHI0b3F5azVzcXUwazJkYzN2eTM4OG9jbXlvdDAybyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/BOScuFuno5zNxZsPVP/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXM3MTZpMW1kbHI0b3F5azVzcXUwazJkYzN2eTM4OG9jbXlvdDAybyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l36kU80xPf0ojG0Erg/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXM3MTZpMW1kbHI0b3F5azVzcXUwazJkYzN2eTM4OG9jbXlvdDAybyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cF7QqO5DYdft6/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OGxrY21kZjJ2b251OWE5Mnl5eXhpaWZmZ2F0bXJpMHp0aWlhdWFrayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l4Jz3a8jO92crUlWM/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OGxrY21kZjJ2b251OWE5Mnl5eXhpaWZmZ2F0bXJpMHp0aWlhdWFrayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/pUVOeIagS1rrqsYQJe/giphy.gif",
    "https://i.pinimg.com/736x/e8/62/d3/e862d3a9e2470e3958d1a28e16976ad9.jpg",
    "https://i.pinimg.com/originals/02/63/b3/0263b3d0abcb4fd26679c8902f59195c.jpg",
    "https://i.pinimg.com/originals/d4/c6/1d/d4c61d7ff315db45c71054123fccf0b4.jpg",
    "https://kenh14cdn.com/203336854389633024/2024/12/26/new-17351873466611704381662-1735198238061-1735198238746230779424.jpg",
    "https://bom.edu.vn/public/upload/2024/12/meme-che-viet-nam-3.webp",
    "https://i.pinimg.com/736x/30/54/ae/3054aee985e2074b742f0769fcf18419.jpg",
    "https://multilanguage.edu.vn/public/upload/2025/01/meme-viet-08.webp",
    "https://i.pinimg.com/736x/88/d9/18/88d918a52f1106113b4b5d0aac7be193.jpg",
    "https://i.pinimg.com/736x/91/70/34/917034b8060a599bf193a643db388b79.jpg",
    "https://i.pinimg.com/736x/12/49/63/124963b6b9a488c084ee63b5b7635716.jpg",
    "https://i.pinimg.com/736x/ad/e8/e6/ade8e6e4305117af5e61cd4a5e559a02.jpg",
    "https://i.pinimg.com/736x/8e/b6/b3/8eb6b362fdc8578ae2a809003e27798d.jpg",
    "https://i.pinimg.com/736x/c3/b6/0e/c3b60e3721845a119915e916984d1168.jpg",
    "https://i.pinimg.com/736x/1c/48/8f/1c488f5b662c7c7d9f8832774c6f01eb.jpg",
    "https://i.pinimg.com/736x/b0/55/45/b05545e3b1c3a7363c3a7acbd9d1969a.jpg",
    "https://i.pinimg.com/736x/06/ce/0b/06ce0b47387375b2e61289e80e80b7bc.jpg"
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Helper functions
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getLocalTime() {
    return new Date(Date.now() + LOCAL_TZ_OFFSET);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Idle chat task
async function idleChatTask() {
    try {
        for (const guild of client.guilds.cache.values()) {
            const textChannels = guild.channels.cache.filter(ch => 
                ch.type === ChannelType.GuildText && 
                ch.permissionsFor(guild.members.me).has('SendMessages')
            );

            for (const [channelId, channel] of textChannels) {
                if (IDLE_CHAT_CHANNELS.length > 0 && !IDLE_CHAT_CHANNELS.includes(parseInt(channelId))) {
                    continue;
                }

                if (lastMessageTime.has(channelId)) {
                    const timeSinceLast = Date.now() - lastMessageTime.get(channelId);
                    
                    if (timeSinceLast > 7200000) { // 2 hours in milliseconds
                        const message = randomChoice(IDLE_MESSAGES);
                        await channel.send(message);
                        lastMessageTime.set(channelId, Date.now());
                        break;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in idle_chat:', error);
    }
}

// Start idle chat interval
setInterval(idleChatTask, 30 * 60 * 1000); // 30 minutes

client.once('ready', async () => {
    console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
    
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commandsData = await rest.put(
            Routes.applicationCommands(client.user.id), 
            { body: commands }
        );
        console.log(`✅ Đã đồng bộ ${commandsData.length} slash commands!`);
    } catch (error) {
        console.error('❌ Lỗi khi đồng bộ commands:', error);
    }

    client.user.setActivity('Sử dụng / để xem lệnh', { 
        type: ActivityType.Streaming,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    });

    console.log('✅ Idle chat task started!');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Skip forbidden words check for command messages
    if (!message.content.startsWith('/')) {
        // Auto-mute for forbidden words
        for (const word of FORBIDDEN_WORDS) {
            if (message.content.toLowerCase().includes(word.toLowerCase())) {
                try {
                    const userId = message.author.id;
                    if (!violations.has(userId)) {
                        violations.set(userId, 0);
                    }
                    const count = violations.get(userId);

                    await message.delete();

                    const logChannel = client.channels.cache.get('1423494094843412562');

                    if (count >= 2) {
                        await message.member.kick('Tái phạm từ cấm nhiều lần');
                        
                        const embed = new EmbedBuilder()
                            .setTitle('🚫 KICK VI PHẠM')
                            .setDescription(`${message.author} đã bị **KICK** vì tái phạm từ cấm nhiều lần!`)
                            .setColor(0xFF0000)
                            .setThumbnail(randomChoice(GIFS.warning))
                            .setFooter({ text: 'Bot Discord', iconURL: client.user.displayAvatarURL() })
                            .setTimestamp(getLocalTime());
                        
                        await message.channel.send({ embeds: [embed] });

                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('🚨 LOG VI PHẠM TỪ CẤM')
                                .setDescription(`**Người vi phạm:** ${message.author} (${message.author.id})\n**Kênh:** ${message.channel}\n**Nội dung:** ${message.content}`)
                                .setColor(0xFF0000)
                                .addFields(
                                    { name: 'Hình phạt', value: 'KICK', inline: true },
                                    { name: 'Lần vi phạm', value: '3', inline: true }
                                )
                                .setTimestamp(getLocalTime());
                            
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    } else {
                        let timeoutDuration, muteText;
                        if (count === 0) {
                            timeoutDuration = 60 * 60 * 1000; // 1 hour
                            muteText = 'MUTE 1 tiếng';
                        } else if (count === 1) {
                            timeoutDuration = 24 * 60 * 60 * 1000; // 24 hours
                            muteText = 'MUTE 24 tiếng';
                        }

                        await message.member.timeout(timeoutDuration, 'Sử dụng từ cấm');
                        violations.set(userId, count + 1);

                        const embed = new EmbedBuilder()
                            .setTitle('⚠️ CẢNH BÁO VI PHẠM')
                            .setDescription(`${message.author} đã bị **${muteText}** vì sử dụng từ cấm!`)
                            .setColor(0xFF0000)
                            .setThumbnail(randomChoice(GIFS.warning))
                            .setFooter({ text: 'Bot Discord', iconURL: client.user.displayAvatarURL() })
                            .setTimestamp(getLocalTime());
                        
                        const msg = await message.channel.send({ embeds: [embed] });
                        setTimeout(() => msg.delete().catch(() => {}), 10000);

                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('🚨 LOG VI PHẠM TỪ CẤM')
                                .setDescription(`**Người vi phạm:** ${message.author} (${message.author.id})\n**Kênh:** ${message.channel}\n**Nội dung:** ${message.content}`)
                                .setColor(0xFF0000)
                                .addFields(
                                    { name: 'Hình phạt', value: muteText, inline: true },
                                    { name: 'Lần vi phạm', value: `${violations.get(userId)}`, inline: true }
                                )
                                .setTimestamp(getLocalTime());
                            
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }
                } catch (error) {
                    console.error('Error handling forbidden word:', error);
                }
                return;
            }
        }
    }

    // Track last message time for idle chat
    if (message.channel.type === ChannelType.GuildText) {
        lastMessageTime.set(message.channel.id, Date.now());
    }

    // Auto-reply to greetings
    if (!message.content.startsWith('/')) {
        const messageLower = message.content.toLowerCase().trim();
        for (const [greeting, responses] of Object.entries(GREETINGS)) {
            if (messageLower.includes(greeting)) {
                if (Math.random() < 0.3) {
                    await message.channel.sendTyping();
                    const delay = 1000 + Math.random() * 2000; // 1-3 seconds
                    await sleep(delay);
                    const response = randomChoice(responses);
                    await message.channel.send(response);
                }
                break;
            }
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const userId = interaction.user.id;
    const currentTime = Date.now() / 1000;

    if (lastCommandTimes.has(userId) && currentTime - lastCommandTimes.get(userId) < 3) {
        const embed = new EmbedBuilder()
            .setTitle('⏳ Chờ một chút')
            .setDescription('Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.')
            .setColor(0xFFFF00);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    lastCommandTimes.set(userId, currentTime);

    try {
        switch (interaction.commandName) {
            case 'announce':
                await handleAnnounce(interaction);
                break;
            case 'userinfo':
                await handleUserinfo(interaction);
                break;
            case 'serverinfo':
                await handleServerinfo(interaction);
                break;
            case 'roll':
                await handleRoll(interaction);
                break;
            case '8ball':
                await handle8ball(interaction);
                break;
            case 'coinflip':
                await handleCoinflip(interaction);
                break;
            case 'clear':
                await handleClear(interaction);
                break;
            case 'avatar':
                await handleAvatar(interaction);
                break;
            case 'meme':
                await handleMeme(interaction);
                break;
            case 'rps':
                await handleRps(interaction);
                break;
            case 'spamdm':
                await handleSpamDM(interaction);
                break;
            case 'stopspamdm':
                await handleStopSpamDM(interaction);
                break;
        }
    } catch (error) {
        console.error('Error handling command:', error);
    }
});

// Command handlers
async function handleAnnounce(interaction) {
    const requiredRole = '1001322797081034752';
    if (!interaction.member.roles.cache.has(requiredRole)) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Lỗi')
            .setDescription('Bạn không có quyền sử dụng lệnh này!')
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const message = interaction.options.getString('message');
    const embed = new EmbedBuilder()
        .setTitle('📢 THÔNG BÁO QUAN TRỌNG')
        .setDescription(`**${message}**`)
        .setColor(randomChoice(COLORS))
        .setImage('https://media.giphy.com/media/RhrAvDQ8V8moL8AzWF/giphy.gif')
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setFooter({ text: `Thông báo bởi ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handleUserinfo(interaction) {
    const member = interaction.options.getMember('member') || interaction.member;
    
    const embed = new EmbedBuilder()
        .setTitle('👤 THÔNG TIN NGƯỜI DÙNG')
        .setDescription(`**${member}**`)
        .setColor(randomChoice(COLORS))
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
            { name: '📝 Nickname', value: member.nickname || 'Không có', inline: true },
            { name: '📅 Tham gia server', value: member.joinedAt.toLocaleDateString('vi-VN'), inline: true },
            { name: '🎂 Tạo tài khoản', value: member.user.createdAt.toLocaleDateString('vi-VN'), inline: true },
            { name: '🎭 Roles', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r).join(' ') || 'Không có', inline: false }
        )
        .setFooter({ text: 'Bot Discord', iconURL: client.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handleServerinfo(interaction) {
    const guild = interaction.guild;
    
    const embed = new EmbedBuilder()
        .setTitle('🏰 THÔNG TIN SERVER')
        .setDescription(`**${guild.name}**`)
        .setColor(randomChoice(COLORS))
        .setThumbnail(guild.iconURL())
        .addFields(
            { name: '🆔 ID', value: `\`${guild.id}\``, inline: true },
            { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: '👥 Thành viên', value: `**${guild.memberCount}**`, inline: true },
            { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
            { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
            { name: '📅 Tạo lúc', value: guild.createdAt.toLocaleDateString('vi-VN'), inline: true }
        )
        .setFooter({ text: 'Bot Discord', iconURL: client.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handleRoll(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const result = Math.floor(Math.random() * sides) + 1;
    
    const embed = new EmbedBuilder()
        .setTitle('🎲 LẮC XÚC XẮC')
        .setDescription(`🎯 Kết quả: **${result}**/${sides}`)
        .setColor(randomChoice(COLORS))
        .setThumbnail(randomChoice(GIFS.fun))
        .setFooter({ text: `Người lắc: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handle8ball(interaction) {
    const question = interaction.options.getString('question');
    const responses = [
        "Chắc chắn rồi!", "Không có cửa đâu!", "Có thể lắm!",
        "Hỏi lại sau nhé!", "Tôi nghĩ là không", "100% luôn!",
        "Khó nói lắm...", "Theo tôi thì có", "Đừng trông chờ vào nó"
    ];

    const embed = new EmbedBuilder()
        .setTitle('🎱 PHÉP THUẬT 8BALL')
        .setColor(randomChoice(COLORS))
        .setThumbnail('https://media.giphy.com/media/3o7TKP9ln2Dr6ze6f6/giphy.gif')
        .addFields(
            { name: '❓ Câu hỏi', value: `*${question}*`, inline: false },
            { name: '🔮 Lời tiên tri', value: `**${randomChoice(responses)}**`, inline: false }
        )
        .setFooter({ text: `Người hỏi: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handleCoinflip(interaction) {
    const result = randomChoice(["Mặt sấp", "Mặt ngửa"]);
    
    const embed = new EmbedBuilder()
        .setTitle('🪙 TUNG ĐỒNG XU')
        .setDescription(`💫 Kết quả: **${result}**`)
        .setColor(randomChoice(COLORS))
        .setImage('https://media.giphy.com/media/a8TIlyVS7JixO/giphy.gif')
        .setFooter({ text: `Người tung: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handleClear(interaction) {
    const requiredRole = '1001322797081034752';
    if (!interaction.member.roles.cache.has(requiredRole)) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Lỗi')
            .setDescription('Bạn không có quyền sử dụng lệnh này!')
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });
    await interaction.channel.bulkDelete(amount);

    const embed = new EmbedBuilder()
        .setTitle('🧹 DỌN DẸP THÀNH CÔNG')
        .setDescription(`✅ Đã xóa **${amount}** tin nhắn!`)
        .setColor(randomChoice(COLORS))
        .setThumbnail('https://media.giphy.com/media/l0MYAiPEXANiJMFMY/giphy.gif')
        .setTimestamp(getLocalTime());

    await interaction.followup.send({ embeds: [embed] });
}

async function handleAvatar(interaction) {
    const member = interaction.options.getUser('member') || interaction.user;
    
    const embed = new EmbedBuilder()
        .setTitle('🖼️ AVATAR')
        .setDescription(`**${member}**`)
        .setColor(randomChoice(COLORS))
        .setImage(member.displayAvatarURL({ size: 1024 }))
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handleMeme(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🖤 Meme ngẫu nhiên')
        .setColor(randomChoice(COLORS))
        .setImage(randomChoice(MEMES))
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handleRps(interaction) {
    const choices = ['kéo', 'búa', 'bao'];
    const userChoice = interaction.options.getString('choice');
    const botChoice = randomChoice(choices);

    let result = "";
    let color = 0xFFFF00;

    if (userChoice === botChoice) {
        result = "Hòa! 🤝";
    } else if (
        (userChoice === 'kéo' && botChoice === 'bao') ||
        (userChoice === 'búa' && botChoice === 'kéo') ||
        (userChoice === 'bao' && botChoice === 'búa')
    ) {
        result = "Bạn thắng! 🎉";
        color = 0x00FF00;
    } else {
        result = "Bạn thua! 😢";
        color = 0xFF0000;
    }

    const embed = new EmbedBuilder()
        .setTitle('✂️🪨📄 OẲN TÙ TÌ')
        .setDescription(`**${result}**`)
        .setColor(color)
        .setThumbnail('https://media.giphy.com/media/3ohzdFRFAi7zQ0VKKY/giphy.gif')
        .addFields(
            { name: '👤 Bạn chọn', value: `**${userChoice}**`, inline: true },
            { name: '🤖 Bot chọn', value: `**${botChoice}**`, inline: true }
        )
        .setFooter({ text: `Người chơi: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

async function handleSpamDM(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const delay = interaction.options.getNumber('delay');
    const message = interaction.options.getString('message');

    if (spamTasks.has(user.id)) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Lỗi')
            .setDescription(`Đang spam ${user}! Dùng \`/stopspamdm\` để dừng trước khi spam lại.`)
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (amount <= 0 || amount > 100000) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Lỗi')
            .setDescription('Số lượng tin nhắn phải từ 1-100000!')
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (delay < 0) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Lỗi')
            .setDescription('Delay không được âm!')
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (message.length > 2000) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Lỗi')
            .setDescription('Nội dung tin nhắn không được vượt quá 2000 ký tự!')
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    spamTasks.set(user.id, { stop: false, requester: interaction.user.id });

    const messagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message;
    const startEmbed = new EmbedBuilder()
        .setTitle('📨 BẮT ĐẦU SPAM DM')
        .setDescription(`🎯 **Target:** ${user}\n📊 **Số lượng:** ${amount} tin nhắn\n⏱️ **Delay:** ${delay} giây\n💬 **Nội dung:** ${messagePreview}\n\n🛑 **Dùng \`/stopspamdm\` để dừng spam**`)
        .setColor(0x00FF00)
        .setFooter({ text: `Khởi tạo bởi ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [startEmbed] });

    let successCount = 0;
    let failCount = 0;
    let stoppedEarly = false;

    for (let i = 0; i < amount; i++) {
        if (spamTasks.get(user.id)?.stop) {
            stoppedEarly = true;
            break;
        }

        try {
            await user.send(message);
            successCount++;

            if (delay > 0) {
                await sleep(delay * 1000);
            }
        } catch (error) {
            failCount++;
            if (error.code === 50007) { // Cannot send messages to this user
                break;
            }
            if (error.code === 429) { // Rate limited
                await sleep(1000);
            }
        }
    }

    spamTasks.delete(user.id);

    const title = stoppedEarly ? '🛑 SPAM BỊ DỪNG' : '✅ HOÀN THÀNH SPAM DM';
    const color = stoppedEarly ? 0xFFFF00 : (failCount === 0 ? 0x00FF00 : 0xFFFF00);
    
    const resultEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`🎯 **Target:** ${user}\n✅ **Thành công:** ${successCount}/${amount}\n❌ **Thất bại:** ${failCount}`)
        .setColor(color)
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    if (failCount > 0) {
        resultEmbed.addFields({
            name: '⚠️ Lưu ý',
            value: 'Một số tin nhắn không gửi được (có thể user đã tắt DM hoặc chặn bot)',
            inline: false
        });
    }

    await interaction.followUp({ embeds: [resultEmbed] });
}

async function handleStopSpamDM(interaction) {
    const user = interaction.options.getUser('user');

    if (!spamTasks.has(user.id)) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Lỗi')
            .setDescription(`Không có spam task nào đang chạy cho ${user}!`)
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const task = spamTasks.get(user.id);
    task.stop = true;

    const embed = new EmbedBuilder()
        .setTitle('🛑 DỪNG SPAM')
        .setDescription(`Đang dừng spam DM cho ${user}...`)
        .setColor(0xFFFF00)
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp(getLocalTime());

    await interaction.reply({ embeds: [embed] });
}

// Define slash commands
const commands = [
    {
        name: 'announce',
        description: 'Gửi thông báo với embed đẹp',
        options: [{
            name: 'message',
            description: 'Nội dung thông báo',
            type: 3,
            required: true
        }]
    },
    {
        name: 'userinfo',
        description: 'Xem thông tin người dùng',
        options: [{
            name: 'member',
            description: 'Người dùng muốn xem thông tin',
            type: 6,
            required: false
        }]
    },
    {
        name: 'serverinfo',
        description: 'Xem thông tin server'
    },
    {
        name: 'roll',
        description: 'Lắc xúc xắc',
        options: [{
            name: 'sides',
            description: 'Số mặt của xúc xắc (mặc định: 6)',
            type: 4,
            required: false
        }]
    },
    {
        name: '8ball',
        description: 'Hỏi câu hỏi và nhận câu trả lời ngẫu nhiên',
        options: [{
            name: 'question',
            description: 'Câu hỏi của bạn',
            type: 3,
            required: true
        }]
    },
    {
        name: 'coinflip',
        description: 'Tung đồng xu'
    },
    {
        name: 'clear',
        description: 'Xóa tin nhắn',
        options: [{
            name: 'amount',
            description: 'Số lượng tin nhắn cần xóa',
            type: 4,
            required: true
        }]
    },
    {
        name: 'avatar',
        description: 'Xem avatar của người dùng',
        options: [{
            name: 'member',
            description: 'Người dùng muốn xem avatar',
            type: 6,
            required: false
        }]
    },
    {
        name: 'meme',
        description: 'Gửi meme ngẫu nhiên'
    },
    {
        name: 'rps',
        description: 'Chơi oẳn tù tì',
        options: [{
            name: 'choice',
            description: 'Chọn: kéo, búa, hoặc bao',
            type: 3,
            required: true,
            choices: [
                { name: '✂️ Kéo', value: 'kéo' },
                { name: '🪨 Búa', value: 'búa' },
                { name: '📄 Bao', value: 'bao' }
            ]
        }]
    },
    {
        name: 'spamdm',
        description: 'Spam DM đến một user',
        options: [
            {
                name: 'user',
                description: 'User cần spam DM',
                type: 6,
                required: true
            },
            {
                name: 'amount',
                description: 'Số lượng tin nhắn (1-100000)',
                type: 4,
                required: true
            },
            {
                name: 'delay',
                description: 'Delay giữa mỗi tin nhắn (giây, 0 = không delay)',
                type: 10,
                required: true
            },
            {
                name: 'message',
                description: 'Nội dung tin nhắn',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'stopspamdm',
        description: 'Dừng spam DM đang chạy',
        options: [{
            name: 'user',
            description: 'User đang bị spam cần dừng',
            type: 6,
            required: true
        }]
    }
];

client.login(process.env.DISCORD_TOKEN);
