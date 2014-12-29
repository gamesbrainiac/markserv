#markserv

markserv allows you to edit markdown documents and view the realtime changes in your web browser.

markserv is designed to replace a MAMP + Marked2 workflow.

markserv is a real-time Markdown server that automatically serves markdown files in HTML with Github flavor CSS and syntax highlighting.

markserv follows links to other external files automatially.

markserv watches for file updates to the markdown file, and to the CSS directory, and autoamatically reloads the Markdown page via websockets. markserv remembers the scroll position you were at in the web browser, and reloads the page with the same scroll position when you make changes.

markserv was built for working on projects that contain a combination of web content and Markdown, where the markdown gets reloaded on the fly as the file is saved in your text editor. But it also serves regular HTTP content, replacing the need for a more bulky web server setup using MAMP, etc.


##Install

Install the markserv server via npm.

```bash
    npm install markserv
```

##Usage

Change to the directory of your CLI.

    cd path/to/serve/from

Begin serving markdown as HTML on port 8080

    markserv ./



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




