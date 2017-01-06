var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var hb = require('handlebars');


//EXIT CODES:
// 3: Can't access the static directory.
staticdir = process.argv[2] || process.cwd() + path.sep+ "files";
fs.exists(staticdir, (exists) => {
	if (!exists){
		console.log("Specify valid static directory.");
		process.exit(3);	
	}
});

var mimetypes = {
	".html": "text/html",
	".txt": "text/plain",
	".jpeg": "image/jpeg",
	".jpg": "image/jpeg",
	".png": "image/png",
	".js": "text/javascript",
	".css": "text/css",
}

http.createServer(function (req, res) {
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	var uri = url.parse(req.url).pathname;
	if (uri == "/"){
		uri = staticdir;
	}
	if (uri.indexOf("..") > 0 || ! uri.startsWith(staticdir)){ //Don't allow relative paths.
		res.writeHead(500, {"Content-Type":"text/plain"});
		res.write("500 Internal server error.");
		res.end();
		return;
	}
	var fileName = uri;
	fs.lstat(fileName, (err, stats) => {


		if (err){
			console.log("Error accessing resource " + fileName)
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.write("404 not found.\n");
			res.end()
			return;
		}
		// file or dir.
	if (stats.isFile()) {
		var mimetype = mimetypes[path.extname(fileName)];
		res.writeHead(200, { "Content-Type": mimetype });
		var fileStream = fs.createReadStream(fileName);
		fileStream.pipe(res);
	} else if (stats.isDirectory()) {
		var entries = [];
		fs.readdir(fileName, function (err, files) {
			files.forEach(function (file) {
				var fullname =  uri + path.sep + file;
				var st = fs.lstatSync(fullname);
				var regex = RegExp(`.+?/${staticdir}`);
				var link = fullname.replace(regex, "http://" + req.headers["host"] + `${staticdir}`);

				var ent = { "fullname": fullname, "isFile": st.isFile(), "size": st.size, "filename": path.basename(fullname), "link": link };
				entries.push(ent);
			});
			var source = fs.readFileSync('./templates/dirindex.html', 'utf-8');
			var template = hb.compile(source);
			var result = template({ "entries": entries });
			res.writeHead(200, { "Content-Type": "text/html" });
			res.write(result);
			res.end();
		});
	} else {
		res.writeHead(500, { "Content-Type": "text/plain" });
		res.write("500 Internal Error.")
		res.end();
	}
	});
}).listen(3002);

console.log('Server started...')
