<!DOCTYPE html>
<html>
	<head>
		<title></title>
		<meta charset="utf-8" />
	</head>
	<body>
        <div id="builder-js"><!-- / --></div>
        <script src="Builder.JS/Scripts/Builder.JS.min.js"></script>
        <script>
        (function() {
            /* type /help in the console for help options */
            window.jsmin = new BuilderJs({
				files: [
                        "Scripts/jquery-1.7.1.js",
                        "Scripts/jquery.ui.core.js",
                        "Scripts/jquery.ui.widget.js",
                        "Scripts/jquery.ui.mouse.js",
                        "Scripts/jquery.ui.position.js",
                        "Scripts/jquery.ui.draggable.js",
                        "Scripts/jquery.ui.droppable.js",
                        "Scripts/jquery.ui.resizable.js",
                        "Scripts/jquery.ui.selectable.js",
                        "Scripts/jquery.ui.sortable.js"
                ], // Array of files that will be added to the compilation
                options: {
                    justMerge: false, // Boolean (if set to true, the output will not be encoded or minified, and variables will not be shrunk)
                    base62encode: true, // Boolean (if set to true, the output will be Base-62 encoded)
                    shrinkVariables: true, // Boolean (if set to true, the variable names will be replaced against hardly readable values)
                    outputFileName: "Scripts/jquery.all.min.js", // URL of the processed file
                    outputFormat: "string" // "file" | "string" ("file" will save the output to a physical file, "string" will display it in a textbox so it can be copied and saved manually)
                }
            });
            window.jsmin.init(); // initialize the application
        })();
        </script>
	</body>
</html>