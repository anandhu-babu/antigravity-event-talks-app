# BigQuery Release Notes Dashboard & X/Twitter Sharer

A modern, high-fidelity web dashboard built with **Python Flask** and **Vanilla Web Technologies (HTML, CSS, JS)** to track Google Cloud BigQuery release updates and selectively post summaries to X (formerly Twitter).

---

## ✨ Features

- **Automated XML Parsing**: Directly consumes the Google Cloud BigQuery release notes XML feed, parsing and normalizing updates.
- **Micro-Categorization**: Automatically extracts updates from date blocks using `BeautifulSoup` and groups them by category (Features, Changes, Deprecations, Fixes, General).
- **Glassmorphic UI**: High-tech, dark space visual style featuring responsive grids, blurred glass cards, status badges, and glowing animations.
- **Stats Counter**: Live calculations tracking the frequency of Features, Changes, and Deprecations.
- **Interactive Search & Filter**: Real-time keyword filter input combined with category filter chips for smooth exploration.
- **Interactive Tweet Composer**: Click on any release note to trigger a custom X/Twitter composer modal, complete with automatic text trimming and a real-time 280 character limit validator.

---

## 📂 Project Structure

```
├── app.py                  # Flask backend & BigQuery XML parsing logic
├── templates/
│   └── index.html          # HTML structure & modals
├── static/
│   ├── style.css           # Glowing glassmorphic stylesheets
│   └── app.js              # Client state, rendering, and Twitter sharing handlers
├── .gitignore              # Ignores bytecodes, environments, and caches
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### 📋 Prerequisites
Make sure Python 3.9+ is installed on your machine.

### 📥 Installation
1. Clone the repository to your local directory:
   ```bash
   git clone https://github.com/anandhu-babu/antigravity-event-talks-app.git
   cd antigravity-event-talks-app
   ```

2. Install dependencies:
   ```bash
   pip install flask requests feedparser beautifulsoup4
   ```

### 🏃 Running the Application
Start the Flask application:
```bash
python app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser.

---

## 🔄 How the XML Parsing Works
1. When you access the app or click **Refresh**, a request is sent to Flask `/api/releases`.
2. Flask fetches `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
3. The server uses `feedparser` to extract entries and `BeautifulSoup` to find `<h3>` headings.
4. It isolates the HTML following each `<h3>` element to group specific updates, normalizes any relative URLs to absolute Google Cloud documentation URLs, and returns them as a JSON response.
5. The frontend handles category badge assignment, search indexing, and layouts.

---

## 🐦 Tweeting Release Notes
1. Click the **Tweet** button on any card.
2. An interactive composer card pops up with the date, category, summarized description, and documentation link.
3. Edit the message text inside the preview. The character validator will warning-color the character count if the text exceeds the 280-character limit.
4. Click **Post to X** to open a new tab containing the pre-filled X Web Intent compose window.
