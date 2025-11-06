import discord
from discord.ext import commands, tasks
import os
from dotenv import load_dotenv
import random
import datetime
import time
import asyncio
from flask import Flask

import threading

app = Flask(__name__)

@app.route("/")

def home():

    return "Bot đang chạy!"

def run_web():

    app.run(host="0.0.0.0", port=8080)

threading.Thread(target=run_web).start()

LOCAL_TZ = datetime.timezone(datetime.timedelta(hours=7))

last_command_times = {}
last_message_time = {}  # Track last message time per channel

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True
intents.members = True
bot = commands.Bot(command_prefix='b!', intents=intents, help_command=None)

# Forbidden words list
FORBIDDEN_WORDS = [
    "cái lồn má", 'spam', 'toxic',
    'đĩ', 'đĩ rạc', 'con đĩ', 'đéo', 'địt', 'lồn', 'cặc', 'buồi', 'vãi', 'đụ', 'mẹ mày', 'cha mày', 'ông mày', 'bà mày',
    'con mẹ mày', 'con cha mày', 'thằng điên', 'đồ ngu', 'óc chó', 'thằng khốn', 'con khốn', 'đồ khốn nạn', 'thằng óc',
    'con óc', 'đồ óc', 'thằng ngu', 'con ngu', 'đồ ngu',
    # Variations
    'lon', 'l0n', 'lôn', 'lỏn', 'cac', 'c@c', 'dit', 'dít', 'di', 'dĩ', 'dỉ', 'deo', 'buoi', 'vai', 'du',
    'me may', 'cha may', 'ong may', 'ba may', 'con me may', 'con cha may', 'thang dien', 'do ngu', 'oc cho',
    'thang khon', 'con khon', 'do khon nan', 'thang oc', 'con oc', 'do oc', 'thang ngu', 'con ngu', 'do ngu',
    'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell', 'crap', 'bastard', 'slut', 'whore', 'dick', 'pussy', 'cock', 'ass', 'tits', 'boobs', 'fucker', 'motherfucker',
    'cunt', 'nigger', 'faggot', 'retard',
    # More variations
    'f*ck', 'fuk', 'sh*t', 'b*tch', 'assh*le', 'd*mn', 'h*ll', 'cr*p', 'b*stard', 'sl*t', 'wh*re', 'd*ck', 'p*ssy', 'c*ck', 'a*s', 't*ts', 'b*obs', 'f*cker', 'm*therf*cker', 'c*nt', 'n*gger', 'f*ggot', 'ret*rd'
]

# Violations tracking
violations = {}

# Colors for embeds
COLORS = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xF7DC6F,
          0xBB8FCE, 0x85C1E2, 0xF8C471, 0xABEBC6]

# GIFs for embeds
GIFS = {
    'fun': ['https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3phbXQyamNubG03Ymxobm5zbWx5Mmwzcm55dm91MXAxMXoydHdiNSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ppSjX2iP9Ec1ExJRsV/giphy.gif', 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3VrcTBqamxsOTYyMWV5dXF1N3VtcGJjYmpiZGNnOHE3c3lxMGI3eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VEzYdo930nTiTuVeMU/giphy.gif'],
    'warning': ['https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2F1ZnA0am1nbzh4bXVqbmJ4b2Zrc3RrOXI2cTZqN2oyemR2eXZsciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/zkNBtlymM6zX4DndrU/giphy.gif']
}

# Auto-reply keywords
GREETINGS = {
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
}

# Fun questions and messages for idle chat
IDLE_MESSAGES = [
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
    '🎲 Có ai muốn chơi game không? Dùng `b!rps` để chơi oẳn tù tì với mình nè!',
    '🎰 Thử vận may với `b!roll` xem sao! 🍀',
    '😴 Server vắng quá... có ai ở đây không? 👻'
]

# Channel IDs that bot will send idle messages to (set your general channel ID here)
# Leave empty to send to all text channels, or add specific channel IDs
IDLE_CHAT_CHANNELS = []


@bot.event
async def on_ready():
    print(f'✅ Bot đã đăng nhập: {bot.user.name}')
    await bot.change_presence(activity=discord.Streaming(name="b!help để xem lệnh", url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
    if not idle_chat.is_running():
        idle_chat.start()
        print('✅ Idle chat task started!')

# Background task to send messages when channel is idle


@tasks.loop(minutes=30)  # Check every 30 minutes
async def idle_chat():
    try:
        for guild in bot.guilds:
            # Get text channels
            text_channels = [ch for ch in guild.text_channels if ch.permissions_for(
                guild.me).send_messages]

            for channel in text_channels:
                # Skip if channel is in ignore list (if IDLE_CHAT_CHANNELS is not empty, only use those)
                if IDLE_CHAT_CHANNELS and channel.id not in IDLE_CHAT_CHANNELS:
                    continue

                # Check last message time
                if channel.id in last_message_time:
                    time_since_last = datetime.datetime.now() - \
                        last_message_time[channel.id]

                    # If more than 2 hours of inactivity, send a message
                    if time_since_last.total_seconds() > 7200:  # 2 hours
                        message = random.choice(IDLE_MESSAGES)
                        await channel.send(message)
                        last_message_time[channel.id] = datetime.datetime.now()
                        break  # Only send to one channel per guild
    except Exception as e:
        print(f'Error in idle_chat: {e}')


@idle_chat.before_loop
async def before_idle_chat():
    await bot.wait_until_ready()


@bot.event
async def on_message(message):
    if message.author == bot.user:
        return

    # Skip forbidden words check for command messages
    if not message.content.startswith(bot.command_prefix):
        # Auto-mute for forbidden words
        for word in FORBIDDEN_WORDS:
            if word.lower() in message.content.lower():
                try:
                    user_id = message.author.id
                    if user_id not in violations:
                        violations[user_id] = 0
                    count = violations[user_id]

                    await message.delete()

                    log_channel = bot.get_channel(1423494094843412562)

                    if count >= 2:
                        await message.author.kick(reason="Tái phạm từ cấm nhiều lần")
                        embed = discord.Embed(
                            title="🚫 KICK VI PHẠM",
                            description=f"{message.author.mention} đã bị **KICK** vì tái phạm từ cấm nhiều lần!",
                            color=0xFF0000,
                            timestamp=datetime.datetime.now(LOCAL_TZ)
                        )
                        embed.set_thumbnail(url=random.choice(GIFS['warning']))
                        embed.set_footer(
                            text="Bot Discord", icon_url=bot.user.avatar.url if bot.user.avatar else None)
                        await message.channel.send(embed=embed)

                        if log_channel:
                            log_embed = discord.Embed(
                                title="🚨 LOG VI PHẠM TỪ CẤM",
                                description=f"**Người vi phạm:** {message.author.mention} ({message.author.id})\n**Kênh:** {message.channel.mention}\n**Nội dung:** {message.content}",
                                color=0xFF0000,
                                timestamp=datetime.datetime.now(LOCAL_TZ)
                            )
                            log_embed.add_field(
                                name="Hình phạt", value="KICK", inline=True)
                            log_embed.add_field(
                                name="Lần vi phạm", value="3", inline=True)
                            await log_channel.send(embed=log_embed)
                    else:
                        if count == 0:
                            timeout_duration = datetime.timedelta(hours=1)
                            mute_text = "MUTE 1 tiếng"
                        elif count == 1:
                            timeout_duration = datetime.timedelta(hours=24)
                            mute_text = "MUTE 24 tiếng"

                        await message.author.timeout(timeout_duration, reason="Sử dụng từ cấm")
                        violations[user_id] += 1

                        embed = discord.Embed(
                            title="⚠️ CẢNH BÁO VI PHẠM",
                            description=f"{message.author.mention} đã bị **{mute_text}** vì sử dụng từ cấm!",
                            color=0xFF0000,
                            timestamp=datetime.datetime.now(LOCAL_TZ)
                        )
                        embed.set_thumbnail(url=random.choice(GIFS['warning']))
                        embed.set_footer(
                            text="Bot Discord", icon_url=bot.user.avatar.url if bot.user.avatar else None)
                        await message.channel.send(embed=embed, delete_after=10)

                        if log_channel:
                            log_embed = discord.Embed(
                                title="🚨 LOG VI PHẠM TỪ CẤM",
                                description=f"**Người vi phạm:** {message.author.mention} ({message.author.id})\n**Kênh:** {message.channel.mention}\n**Nội dung:** {message.content}",
                                color=0xFF0000,
                                timestamp=datetime.datetime.now(LOCAL_TZ)
                            )
                            log_embed.add_field(
                                name="Hình phạt", value=mute_text, inline=True)
                            log_embed.add_field(
                                name="Lần vi phạm", value=f"{violations[user_id]}", inline=True)
                            await log_channel.send(embed=log_embed)
                except:
                    pass
                return

    # Track last message time for idle chat
    if isinstance(message.channel, discord.TextChannel):
        last_message_time[message.channel.id] = datetime.datetime.now()

    # Auto-reply to greetings (only if not a command)
    if not message.content.startswith(bot.command_prefix):
        message_lower = message.content.lower().strip()
        for greeting, responses in GREETINGS.items():
            if greeting in message_lower:
                # Random chance to reply (30% chance to not be too annoying)
                if random.random() < 0.3:
                    # Show typing indicator
                    async with message.channel.typing():
                        # Random delay 1-3 seconds to look natural
                        delay = random.uniform(1.0, 3.0)
                        await asyncio.sleep(delay)
                        response = random.choice(responses)
                        await message.channel.send(response)
                break

    await bot.process_commands(message)


@bot.command(name='announce', help='Gửi thông báo với embed !')
async def announce(ctx, *, message):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    # Check if user has required role
    required_role = 1001322797081034752
    if not any(role.id == required_role for role in ctx.author.roles):
        embed = discord.Embed(
            title="❌ Lỗi",
            description="Bạn không có quyền sử dụng lệnh này!",
            color=0xFF0000
        )
        return await ctx.send(embed=embed)

    await ctx.message.delete()
    embed = discord.Embed(
        title="📢 THÔNG BÁO QUAN TRỌNG",
        description=f"**{message}**",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_image(
        url="https://media.giphy.com/media/RhrAvDQ8V8moL8AzWF/giphy.gif")
    embed.set_author(name=ctx.guild.name,
                     icon_url=ctx.guild.icon.url if ctx.guild.icon else None)
    embed.set_footer(text=f"Thông báo bởi {ctx.author.name}",
                     icon_url=ctx.author.avatar.url if ctx.author.avatar else None)
    await ctx.send(embed=embed)


@bot.command(name='userinfo', help='Xem thông tin người dùng')
async def userinfo(ctx, member: discord.Member = None):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    member = member or ctx.author

    embed = discord.Embed(
        title=f"👤 THÔNG TIN NGƯỜI DÙNG",
        description=f"**{member.mention}**",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_thumbnail(url=member.avatar.url if member.avatar else None)
    embed.add_field(name="🆔 ID", value=f"`{member.id}`", inline=True)
    embed.add_field(name="📝 Nickname",
                    value=member.nick or "Không có", inline=True)
    embed.add_field(name="📅 Tham gia server",
                    value=member.joined_at.strftime("%d/%m/%Y"), inline=True)
    embed.add_field(name="🎂 Tạo tài khoản",
                    value=member.created_at.strftime("%d/%m/%Y"), inline=True)
    embed.add_field(name="🎭 Roles", value=" ".join(
        [role.mention for role in member.roles[1:]]) or "Không có", inline=False)
    embed.set_footer(text="Bot Discord",
                     icon_url=bot.user.avatar.url if bot.user.avatar else None)

    await ctx.send(embed=embed)


@bot.command(name='serverinfo', help='Xem thông tin server')
async def serverinfo(ctx):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    guild = ctx.guild
    embed = discord.Embed(
        title=f"🏰 THÔNG TIN SERVER",
        description=f"**{guild.name}**",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_thumbnail(url=guild.icon.url if guild.icon else None)
    embed.add_field(name="🆔 ID", value=f"`{guild.id}`", inline=True)
    embed.add_field(name="👑 Owner", value=guild.owner.mention, inline=True)
    embed.add_field(name="👥 Thành viên",
                    value=f"**{guild.member_count}**", inline=True)
    embed.add_field(name="💬 Channels", value=len(guild.channels), inline=True)
    embed.add_field(name="🎭 Roles", value=len(guild.roles), inline=True)
    embed.add_field(name="📅 Tạo lúc", value=guild.created_at.strftime(
        "%d/%m/%Y"), inline=True)
    embed.set_footer(text="Bot Discord",
                     icon_url=bot.user.avatar.url if bot.user.avatar else None)

    await ctx.send(embed=embed)


@bot.command(name='roll', help='Lắc xúc xắc')
async def roll(ctx, sides: int = 6):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    result = random.randint(1, sides)
    embed = discord.Embed(
        title="🎲 LẮC XÚC XẮC",
        description=f"🎯 Kết quả: **{result}**/{sides}",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_thumbnail(url=random.choice(GIFS['fun']))
    embed.set_footer(text=f"Người lắc: {ctx.author.name}",
                     icon_url=ctx.author.avatar.url if ctx.author.avatar else None)
    await ctx.send(embed=embed)


@bot.command(name='8ball', help='Hỏi câu hỏi và nhận câu trả lời ngẫu nhiên')
async def eightball(ctx, *, question):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    responses = [
        "Chắc chắn rồi!", "Không có cửa đâu!", "Có thể lắm!",
        "Hỏi lại sau nhé!", "Tôi nghĩ là không", "100% luôn!",
        "Khó nói lắm...", "Theo tôi thì có", "Đừng trông chờ vào nó"
    ]

    embed = discord.Embed(
        title="🎱 PHÉP THUẬT 8BALL",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_thumbnail(
        url="https://media.giphy.com/media/3o7TKP9ln2Dr6ze6f6/giphy.gif")
    embed.add_field(name="❓ Câu hỏi", value=f"*{question}*", inline=False)
    embed.add_field(name="🔮 Lời tiên tri",
                    value=f"**{random.choice(responses)}**", inline=False)
    embed.set_footer(text=f"Người hỏi: {ctx.author.name}",
                     icon_url=ctx.author.avatar.url if ctx.author.avatar else None)
    await ctx.send(embed=embed)


@bot.command(name='coinflip', help='Tung đồng xu')
async def coinflip(ctx):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    result = random.choice(["Mặt sấp", "Mặt ngửa"])
    embed = discord.Embed(
        title="🪙 TUNG ĐỒNG XU",
        description=f"💫 Kết quả: **{result}**",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_image(
        url="https://media.giphy.com/media/a8TIlyVS7JixO/giphy.gif")
    embed.set_footer(text=f"Người tung: {ctx.author.name}",
                     icon_url=ctx.author.avatar.url if ctx.author.avatar else None)
    await ctx.send(embed=embed)


@bot.command(name='clear', help='Xóa tin nhắn')
async def clear(ctx, amount: int):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    # Check if user has required role
    required_role = 1001322797081034752
    if not any(role.id == required_role for role in ctx.author.roles):
        embed = discord.Embed(
            title="❌ Lỗi",
            description="Bạn không có quyền sử dụng lệnh này!",
            color=0xFF0000
        )
        return await ctx.send(embed=embed)

    await ctx.channel.purge(limit=amount + 1)
    embed = discord.Embed(
        title="🧹 DỌN DẸP THÀNH CÔNG",
        description=f"✅ Đã xóa **{amount}** tin nhắn!",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_thumbnail(
        url="https://media.giphy.com/media/l0MYAiPEXANiJMFMY/giphy.gif")
    await ctx.send(embed=embed, delete_after=5)


@bot.command(name='avatar', help='Xem avatar của người dùng')
async def avatar(ctx, member: discord.Member = None):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    member = member or ctx.author
    embed = discord.Embed(
        title=f"🖼️ AVATAR",
        description=f"**{member.mention}**",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_image(url=member.avatar.url if member.avatar else None)
    embed.set_footer(text=f"Yêu cầu bởi {ctx.author.name}",
                     icon_url=ctx.author.avatar.url if ctx.author.avatar else None)
    await ctx.send(embed=embed)


@bot.command(name='meme', help='Gửi meme ngẫu nhiên')
async def meme(ctx):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    memes = [
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
        # New memes added
        "https://i.pinimg.com/736x/88/d9/18/88d918a52f1106113b4b5d0aac7be193.jpg",
        "https://i.pinimg.com/736x/91/70/34/917034b8060a599bf193a643db388b79.jpg",
        "https://i.pinimg.com/736x/12/49/63/124963b6b9a488c084ee63b5b7635716.jpg",
        "https://i.pinimg.com/736x/ad/e8/e6/ade8e6e4305117af5e61cd4a5e559a02.jpg",
        "https://i.pinimg.com/736x/8e/b6/b3/8eb6b362fdc8578ae2a809003e27798d.jpg",
        "https://i.pinimg.com/736x/c3/b6/0e/c3b60e3721845a119915e916984d1168.jpg",
        "https://i.pinimg.com/736x/1c/48/8f/1c488f5b662c7c7d9f8832774c6f01eb.jpg",
        "https://i.pinimg.com/736x/b0/55/45/b05545e3b1c3a7363c3a7acbd9d1969a.jpg",
        "https://i.pinimg.com/736x/06/ce/0b/06ce0b47387375b2e61289e80e80b7bc.jpg"
    ]

    embed = discord.Embed(
        title=" 🖤 Meme ngẫu nhiên ",
        color=random.choice(COLORS),
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_image(url=random.choice(memes))
    embed.set_footer(text=f"Yêu cầu bởi {ctx.author.name}",
                     icon_url=ctx.author.avatar.url if ctx.author.avatar else None)
    await ctx.send(embed=embed)


@bot.command(name='rps', help='Chơi oẳn tù tì')
async def rps(ctx, choice: str):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    choices = ['kéo', 'búa', 'bao']
    bot_choice = random.choice(choices)

    choice = choice.lower()
    if choice not in choices:
        embed = discord.Embed(
            title="❌ Lỗi",
            description="Vui lòng chọn: kéo, búa, hoặc bao",
            color=0xFF0000
        )
        return await ctx.send(embed=embed)

    result = ""
    if choice == bot_choice:
        result = "Hòa! 🤝"
    elif (choice == 'kéo' and bot_choice == 'bao') or \
         (choice == 'búa' and bot_choice == 'kéo') or \
         (choice == 'bao' and bot_choice == 'búa'):
        result = "Bạn thắng! 🎉"
    else:
        result = "Bạn thua! 😢"

    embed = discord.Embed(
        title="✂️🪨📄 OẲN TÙ TÌ",
        description=f"**{result}**",
        color=0x00FF00 if "thắng" in result else 0xFF0000 if "thua" in result else 0xFFFF00,
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )
    embed.set_thumbnail(
        url="https://media.giphy.com/media/3ohzdFRFAi7zQ0VKKY/giphy.gif")
    embed.add_field(name="👤 Bạn chọn", value=f"**{choice}**", inline=True)
    embed.add_field(name="🤖 Bot chọn", value=f"**{bot_choice}**", inline=True)
    embed.set_footer(text=f"Người chơi: {ctx.author.name}",
                     icon_url=ctx.author.avatar.url if ctx.author.avatar else None)
    await ctx.send(embed=embed)


@bot.command(name='help')
async def help(ctx):
    user_id = ctx.author.id
    current_time = time.time()
    if user_id in last_command_times and current_time - last_command_times[user_id] < 3:
        embed = discord.Embed(
            title="⏳ Chờ một chút",
            description="Vui lòng chờ 3 giây trước khi sử dụng lệnh tiếp theo.",
            color=0xFFFF00
        )
        await ctx.send(embed=embed, delete_after=3)
        return
    last_command_times[user_id] = current_time

    embed = discord.Embed(
        title="💗 Menu các lệnh của bot!!",
        description="✨ **Prefix:** `b!`\n━━━━━━━━━━━━━━━━━━",
        color=0xFFB6C1,
        timestamp=datetime.datetime.now(LOCAL_TZ)
    )

    embed.add_field(
        name="🎮 **VUI CHƠI**",
        value="`b!roll [số]` - Lắc xúc xắc\n`b!8ball [câu hỏi]` - Hỏi 8ball\n`b!coinflip` - Tung xu\n`b!rps [kéo/búa/bao]` - Oẳn tù tì\n`b!meme` - Xem meme",
        inline=False
    )

    embed.add_field(
        name="ℹ️ **THÔNG TIN**",
        value="`b!userinfo [@user]` - Info người dùng\n`b!serverinfo` - Info server\n`b!avatar [@user]` - Xem avatar",
        inline=False
    )

    embed.add_field(
        name="🛠️ **QUẢN LÝ**",
        value="`b!announce [nội dung]` - Thông báo\n`b!clear [số]` - Xóa tin nhắn",
        inline=False
    )

    embed.add_field(
        name="🤖 **TÍNH NĂNG TỰ ĐỘNG**",
        value="• Bot sẽ tự động chào lại khi bạn chào!\n• Bot sẽ tự động gửi câu hỏi vui khi server vắng quá lâu (2 giờ)",
        inline=False
    )

    embed.set_thumbnail(
        url="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3RwNGN0NW12NWNhZmtmZHhmdzcwcDVsNmRubnIzdW1ucWM1emZoaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/JXibbAa7ysN9K/giphy.gif")
    embed.set_footer(text="Made with 💕 by Bunvian",
                     icon_url=bot.user.avatar.url if bot.user.avatar else None)

    await ctx.send(embed=embed)

bot.run(os.getenv('DISCORD_TOKEN'))
