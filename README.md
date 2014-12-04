#MARKSERV

MARKSERV is designed to replace a MAMP + Marked2 workflow. MARKSERV is a real-time HTTP server that automatically serves markdown files in HTML with Github flavor CSS and syntax highlighting. MERKSERV watches for file updates to the markdown file, and to the LESS CSS directory, and autoamatically reloads the Markdown page via websockets. 

MARKSERV was built for working on projects that contain a combination of web content and Markdown, where the markdown gets reloaded on the fly as the file is saved in your text editor. But it also serves regular HTTP content, replacing the need for a more bulky web server setup using MAMP, etc.

##Warning

This code is highly experimental.

##Instructions


Checkout the repo.

```bash
    checkout git@github.com:F1LT3R/markserv.git
    cd markserv
```


Set the path to your htdocs directory in _server.js_.

```javascript
var dir = '../htdocs'
```

Install the nessesary packages that markserv needs.

```bash
npm install
```

Run the server.

```bash
node server.js
```


Then browse to a Markdown file in your browser (must be ext .md); and start editing your Markdown file in a text editor.

You should now see the page reloading as you save your Markdown file. It should save your scroll position, which helps when editing extemely large documents.




