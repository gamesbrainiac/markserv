#markserv

##What is it?

markserv lets you edit markdown documents and view the changes in your web browser, realtime! markserv saves your scroll position in the browser as you edit :)

##Why is it?

markserv is designed to replace a Apache + Marked2 workflow. 

I purchased [Marked2](http://marked2app.com/) after seeing a colleage use it to edit markdown content. It looked awesome, but it felt clunky. And it didn't integrate with my almost constant CLI usage. While I found Marked2 to have a very well-rounded feature set, it was simply too slow, and too memory intensive.

So...

I put some _Node.js_ on it :)

![Skateboarding Dog](http://media.giphy.com/media/yN6TNQhiIxeW4/giphy.gif)

##Features

 - Basic HTTP server that indexes directories
 - HTTP server renders Markdown files as HTML
 - Markdown rendered with GitHub flavor CSS
 - Markdown rendered with GitHub style syntax highlighting
 - Changes to Markdown update in your browser whenever you save your Markdown file
 - Links to extermal Markdown files re-written and followed by the server

##Installation

Install the markserv server via npm.

```shell
npm install markserv -g
```

##Usage

Change to the directory of your CLI

    cd path/to/serve/from

Start the HTTP markdown server in the current directory on port 8080

    markserv

You should see something like this:

![markserv CLI output](http://i.imgur.com/Ii8ydEN.png)

Click on the "address" link in your terminal to open the browser and index the directory:

![Showing Indexes in markserv](http://i.imgur.com/hwWULtl.png)

In the browser, click on a Markdown file, like "README.md", and markserv should render the Markdown file as HTML in your browser.

![Expected output](http://i.imgur.com/yWv8dGZ.png)

Watch your CLI for server hints:

 - Diretory Indexes
 - Files Served
 - Markdown file updates
 - Errors

![markserv CLI being chatty](http://i.imgur.com/TuO78gt.png)

###Realtime/Live editing

Edit your markdown file, and you should now see the page reloading as you save your Markdown file. It should save your scroll position, which helps when editing extemely large documents.

![Live editing example](http://i.imgur.com/duvFBOF.gif)

###Linking to an external Markdown file

You can link to an external Markdown file in the same way that you use GitHub Wiki links. You can use the example code here to see how external links work.

Example code:

```md
[Skateboarding Dog!](Linked-Markdown-Example)
```

Example link:

[Skateboarding Dog!](Linked-Markdown-Example)


###Using With Auto-Save for SublimeText

Coming soon...

https://packagecontrol.io/packages/auto-save






##Options/Flags

To list the options/flags for the markserv CLI tool:

```shell
markserv --help
```

###Changing the HTTP Directory

You can serve content from a different path using the following command:

```shell
markserv -h /path/to/dir
```

###Changing the HTTP Port

You can change the HTTP Port  like this:

```shell
markserv -p 80
```




##Pre-Requisites

 - Node.js & NPM
 - Web Browser
 - Text Editor



##How does it work?

markserv watches for file updates to the markdown file, and to the CSS directory, and autoamatically reloads the Markdown page via websockets. markserv remembers the scroll position you were at in the web browser, and reloads the page with the same scroll position when you make changes.

markserv was built for working on projects that contain a combination of web content and Markdown, where the markdown gets reloaded on the fly as the file is saved in your text editor. But it also serves regular HTTP content, replacing the need for a more bulky web server setup using MAMP, etc.
