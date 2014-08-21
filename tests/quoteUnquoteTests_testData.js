require('./json2.js');
var jsonfn = require('../node_modules/jsonfn/jsonfn.js');
console.log(jsonfn);


// **** TEST 1: math ****
// Fibonacci calculator -- copied from: view-source:http://php.bubble.ro/fibonacci/

function log10(x){return Math.log(x)*Math.LOG10E};
function estimate_fibo(x)
{
	var Phi=(Math.sqrt(5)+1)/2,phi=Phi-1;

	var nbd=Math.abs(x)*log10(Phi)-log10(5)/2;
	
	return Math.floor(nbd) + 1;
}

// function do_submit()
// {
// 	var n = $('#n').val();

// 	if (n > 20000) {
// 		var estimated = estimate_fibo(n);
	
// 		$('#result').html("<div class=\"alert alert-error\">Fibo(" + n + ") has about " + estimated + " decimals. Have fun computing that.</div>");
// 		return false;
// 	}

//     $('#result').html('<div class="progress progress-striped active"><div class="bar"style="width: 100%;"></div></div>');

//     $.ajax({
//       type: 'POST',
//         url: 'fibo.php',
//         data: 
//         {
//           action:'ajax_fibonacci',
//           n:$('#n').val()
//         },
//         success: function(data) {
//           $('#result').html(data);
//         },
//         error: function (xhr, ajaxOptions, thrownError) {
//             $('#result').html("<div class=\"alert alert-error\"> Error " + xhr.status + ": " + thrownError + "</div>");
//         }
//       });

//       return false;
// }



console.log("fibonacci: ", estimate_fibo(10));




// ***** TEST 2: JSON *****
var jsonDoubleQuoted = {
	"animals": {
		"bear": {
			"color": "black",
			"age": 20,
			"says": function() { console.log("roar"); }
		},
		"crocodile": {
			"color": "green",
			"age": 40,
			"says": function() { console.log("chomp"); }
		},
		"dog": {
			"color": "yellow",
			"age": 7,
			"says": function() { console.log("woof"); }
		}
	},
	"techtopians": [
		"Mark",
		"Gabe"
		,"Chris"
		,"Evan"
	]
};

var jsonSingleQuoted = {
	'animals': {
		'bear': {
			'color': 'black',
			'age': 20,
			'says': function() { console.log('roar'); }
		},
		'crocodile': {
			'color': 'green',
			'age': 40,
			'says': function() { console.log('chomp'); }
		},
		'dog': {
			'color': 'yellow',
			'age': 7,
			'says': function() { console.log('woof'); }
		}
	},
	'techtopians': [
		'Mark',
		'Gabe'
		,'Chris'
		,'Evan'
	]
};


// testing function-stringification: http://stackoverflow.com/questions/7759200/is-there-any-possibility-to-have-json-stringify-preserve-functions/7759247#7759247
jsonDoubleQuoted.animals.bear.says = jsonDoubleQuoted.animals.bear.says.toString();
jsonDoubleQuoted.animals.crocodile.says = jsonDoubleQuoted.animals.crocodile.says.toString();
jsonDoubleQuoted.animals.dog.says = jsonDoubleQuoted.animals.dog.says.toString();
jsonSingleQuoted.animals.bear.says = jsonSingleQuoted.animals.bear.says.toString();
jsonSingleQuoted.animals.crocodile.says = jsonSingleQuoted.animals.crocodile.says.toString();
jsonSingleQuoted.animals.dog.says = jsonSingleQuoted.animals.dog.says.toString();


// output the structures
var jdq1Str = jsonfn.JSONfn.stringify(jsonDoubleQuoted);
var jsq1Str = jsonfn.JSONfn.stringify(jsonSingleQuoted);
console.log("1: jdq1Str: ", jdq1Str);
console.log("1: jsq1Str: ", jsq1Str);

var jdq2Parsed = jsonfn.JSONfn.parse(jsonfn.JSONfn.stringify(jsonDoubleQuoted));
var jsq2Parsed = jsonfn.JSONfn.parse(jsonfn.JSONfn.stringify(jsonSingleQuoted));
console.log("2: jdq2Parsed: ", jdq2Parsed);
console.log("2: jsq2Parsed: ", jsq2Parsed);


// test array-lookup
var jdq1EvalLookupScriptArr = "(jsonfn.JSONfn.parse(jdq1Str)).techtopians[2]";
var jdq1EvalLookup = eval(jdq1EvalLookupScriptArr);
console.log("jdq1EvalLookupScriptArr: ", jdq1EvalLookup);

var jsq1EvalLookupScriptArr = "(jsonfn.JSONfn.parse(jsq1Str)).techtopians[2]";
var jsq1EvalLookup = eval(jsq1EvalLookupScriptArr);
console.log("jsq1EvalLookupScriptArr: ", jsq1EvalLookup);


// test dot-path lookup
(jsonfn.JSONfn.parse(jdq1Str)).animals.crocodile.says();
(jsonfn.JSONfn.parse(jsq1Str)).animals.crocodile.says();


// ***** TEST 3: eval *****
eval("console.log('eval works!')");
