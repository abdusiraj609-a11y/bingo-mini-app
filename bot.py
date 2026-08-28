from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes
import json
import os

TOKEN = os.environ.get("TOKEN")
if not TOKEN:
    raise RuntimeError("TOKEN environment variable is not set")

users = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = user.id
    
    if user_id not in users:
        users[user_id] = {'balance': 100, 'wins': 0}
    
    keyboard = [
        [InlineKeyboardButton(
            "🎰 افتح لعبة البنغو",
            web_app=WebAppInfo(url="https://abdusiraj609-a11y.github.io/bingo-mini-app/")
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"🎰 مرحباً {user.first_name}!\n"
        f"💰 الرصيد: {users[user_id]['balance']} ETB\n\n"
        "اضغط على الزر أدناه لفتح لعبة البنغو 🎯",
        reply_markup=reply_markup
    )

async def balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    balance = users.get(user_id, {}).get('balance', 0)
    await update.message.reply_text(f"💰 رصيدك: {balance} ETB")

def main():
    app = Application.builder().token(TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("balance", balance))
    
    print("🚀 البوت يعمل...")
    app.run_polling()

if __name__ == "__main__":
    main()
