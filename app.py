import os
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to avoid rate limits and keep the UI fast
cache = {
    "data": None,
    "last_updated": None
}

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse feed with feedparser
        feed = feedparser.parse(response.content)
        
        releases = []
        for entry in feed.entries:
            date = entry.title
            link = entry.link
            updated = entry.get('updated', '')
            
            # Content or summary
            content_html = ""
            if 'content' in entry and entry.content:
                content_html = entry.content[0].value
            elif 'summary' in entry:
                content_html = entry.summary
                
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Split items by h3 category headers if available
            h3s = soup.find_all('h3')
            items = []
            
            if h3s:
                for h3 in h3s:
                    category = h3.get_text().strip()
                    details_html = []
                    sibling = h3.next_sibling
                    
                    while sibling and sibling.name != 'h3':
                        if sibling.name:
                            # Fix relative links to Google Cloud docs
                            for a in sibling.find_all('a', href=True):
                                if a['href'].startswith('/'):
                                    a['href'] = 'https://docs.cloud.google.com' + a['href']
                                # Make sure all links open in a new tab
                                a['target'] = '_blank'
                                a['rel'] = 'noopener noreferrer'
                            details_html.append(str(sibling))
                        sibling = sibling.next_sibling
                    
                    html_content = "".join(details_html)
                    # Create clean text for sharing/tweeting
                    item_soup = BeautifulSoup(html_content, 'html.parser')
                    text_content = item_soup.get_text().strip()
                    
                    items.append({
                        "category": category,
                        "html": html_content,
                        "text": text_content
                    })
            else:
                # Fallback if there are no H3s (entire entry is one item)
                for a in soup.find_all('a', href=True):
                    if a['href'].startswith('/'):
                        a['href'] = 'https://docs.cloud.google.com' + a['href']
                    a['target'] = '_blank'
                    a['rel'] = 'noopener noreferrer'
                
                text_content = soup.get_text().strip()
                items.append({
                    "category": "General",
                    "html": str(soup),
                    "text": text_content
                })
                
            releases.append({
                "date": date,
                "link": link,
                "updated": updated,
                "items": items
            })
            
        return {"success": True, "releases": releases}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or not cache["data"]:
        res = fetch_and_parse_feed()
        if res["success"]:
            cache["data"] = res["releases"]
            from datetime import datetime
            cache["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            return jsonify({
                "releases": cache["data"],
                "last_updated": cache["last_updated"],
                "source": "live"
            })
        else:
            # If error and we have cached data, return cached with error info
            if cache["data"]:
                return jsonify({
                    "releases": cache["data"],
                    "last_updated": cache["last_updated"],
                    "source": "cache_error",
                    "error": res["error"]
                })
            return jsonify({"error": res["error"]}), 500
            
    return jsonify({
        "releases": cache["data"],
        "last_updated": cache["last_updated"],
        "source": "cache"
    })

if __name__ == '__main__':
    # Listen on all interfaces so it is easy to view or run
    app.run(host='127.0.0.1', port=5000, debug=True)
