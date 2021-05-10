/* For demo purposes only, component to track its own (and parents) amount of renderings */
var RenderCounter = function() {
    var _c = React.useRef(0);
    return React.createElement(
        "div",
        { className: "render-counter " + (++_c.current % 2 ? "odd" : "even") },
        _c.current
    )
}

// Save the original source before pretty printer is fired
function getCodeFromTA(elem) {
    var cm = $(elem).data("cm")
    if (!cm) {
        console.log("Code editors not yet loaded")
        return ""
    }
    var code = cm.getDoc().getValue()
    return code
}

function runCodeHelper(code) {
    // some global vars..
    window.observable = mobx.observable
    window.autorun = mobx.autorun
    window.computed = mobx.computed
    window.action = mobx.action
    window.observer = mobxReactLite.observer
    window.makeObservable = mobx.makeObservable
    window.makeAutoObservable = mobx.makeAutoObservable

    var globalEval = eval // global scope trick, See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval

    try {
    code = Babel.transform(code, {
        presets: ["react", "es2015-no-commonjs", "stage-1"],
    }).code.replace(/"use strict"/g, "")
        globalEval(code)
    } catch (e) {
        console.error(e)
    }
}

function runCode(ids) {
    $(ids.join(",")).each(function(i, elem) {
        clearConsole()
        var code = getCodeFromTA(elem)
        runCodeHelper(code)
    })
}

var runLineHandle = null
var runLineIndex = 0
var lineMarker

function runCodePerLine() {
    if (typeof observableTodoStore === "undefined") {
        runCode(["#code1", "#code3", "#code4", "#react1"])
    }

    function runNext() {
        var cm = $("#play1").data("cm")
        var code = cm.getDoc().getValue()
        var lines = code.split("\n")
        var idx = runLineIndex % lines.length
        var line = lines[idx]
        if (lineMarker) lineMarker.clear()
        lineMarker = cm
            .getDoc()
            .markText(
                { line: idx, ch: 0 },
                { line: idx, ch: line.length },
                { css: "background-color:#ff9955;" }
            )
        runCodeHelper(line)
        runLineIndex++
    }

    if (!runLineHandle) {
        $("#runline-btn").text("Pause")
        runNext()
        runLineHandle = setInterval(runNext, 2000)
    } else {
        clearInterval(runLineHandle)
        runLineHandle = null
        $("#runline-btn").text("Continue")
    }
}

$console = $("#consoleout")
var baseLog = console.log,
    baseError = console.error
console.log = function(arg) {
    baseLog.apply(console, arguments)
    $console.html($console.html() + "<div>" + escapeHtml(arg).replace("\n", "<br/>\n") + "</div>")
}
console.error = function(arg) {
    baseError.apply(console, arguments)
    $console.html(
        $console.html() +
            "<pre style='color:white;background:red;padding:10px;'>" +
            escapeHtml(arg).replace(/\n/, "<br/>") +
            "</pre>\n"
    )
}

function clearConsole() {
    $("#consoleout").text("")
}

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;"
}

function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function(s) {
        return entityMap[s]
    })
}

$(function() {
    $("textarea").each(function(i, t) {
        var cm = CodeMirror.fromTextArea(t, {
            lineNumbers: false,
            mode: "javascript",
            theme: "xq-light"
        })
        $(t).data("cm", cm)
    })
})
