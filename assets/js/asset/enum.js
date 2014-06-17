/*
    The MIT License (MIT)

    Copyright (c) 2013 Axel Rauschmayer
    Copyright (c) 2014 Nils Kenneweg

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

/* global module */

(function (global) {
    "use strict";
    function copyOwnFrom(target, source) {
        Object.getOwnPropertyNames(source).forEach(function(propName) {
            Object.defineProperty(target, propName,
                Object.getOwnPropertyDescriptor(source, propName));
        });
        return target;
    }
    
    function Symbol(name, props) {
        this.name = name;
        if (props) {
            copyOwnFrom(this, props);
        }
        if (Object.freeze) {
            Object.freeze(this);
        }
    }
    /** We don’t want the mutable Object.prototype in the prototype chain */
    Symbol.prototype = Object.create(null);
    Symbol.prototype.constructor = Symbol;
    /**
     * Without Object.prototype in the prototype chain, we need toString()
     * in order to display symbols.
     */
    Symbol.prototype.toString = function () {
        return "|"+this.name+"|";
    };
    if (Object.freeze) {
        Object.freeze(Symbol.prototype);
    }

    var Enum = function (obj) {
        if (arguments.length === 1 && obj !== null && typeof obj === "object") {
            Object.keys(obj).forEach(function (name) {
                this[name] = new Symbol(name, obj[name]);
            }, this);
        } else {
            Array.prototype.forEach.call(arguments, function (name) {
                this[name] = new Symbol(name);
            }, this);
        }
        if (Object.freeze) {
            Object.freeze(this);
        }
    };
    Enum.prototype.symbols = function() {
        return Object.keys(this).map(
            function(key) {
                return this[key];
            }, this
        );
    };
    Enum.prototype.contains = function(sym) {
        if (! sym instanceof Symbol) {
            return false;
        }
        return this[sym.name] === sym;
    };
    Enum.prototype.Symbol = Symbol;

    if(typeof module !== "undefined" && module.exports){
        module.exports = Enum;
    } else if (typeof define === "function") {
        define(function () {
            return Enum;
        });
    } else if (global) {
        global.Enum = Enum;
    }
}(this));
// Explanation of this pattern: http://www.2ality.com/2011/08/universal-modules.html