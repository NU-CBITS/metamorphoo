<!DOCTYPE html>
<html lang="en-US">
	<head>
		<title></title>
        <meta charset="utf-8" />
	</head>
	<body>
        <div id="builder-css"><!-- / --></div>
        <script src="Builder.CSS/Scripts/Builder.CSS.min.js"></script>
        <script>
        (function() {
            window.cssmin = new BuilderCss({
                outputFileName: "styles/styles.min.css", // String
                files: [
                    "styles/styles-1.css", // String
                    "styles/styles-2.css", // String
                    "styles/styles-3.css", // String
                    "styles/styles-4.css", // String
                    "styles/styles-5.css", // String
                    "styles/styles-6.css" // String
                ],
                remove: {
                    lineBreaksAndTabs: true, // Bool
                    extraWhiteSpace: true, // Bool
                    comments: true, // Bool
                    trailingSemiColumnAfterLastPropertyValue: true // Bool
                },
                outputFormat: "file" // "file" | "string"
            });
            window.cssmin.init();
        })();
        </script>
	</body>
</html>