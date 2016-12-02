"use strict";
function copyOwnFrom(target, source) {
    Object.getOwnPropertyNames(source).forEach(function (propName) {
        Object.defineProperty(target, propName, Object.getOwnPropertyDescriptor(source, propName));
    });
    return target;
}

function InternalSymbol(name : string, props?) {
    this.name = name;
    if (props) {
        copyOwnFrom(this, props);
    }
    if (Object.freeze) {
        Object.freeze(this);
    }
}
InternalSymbol.prototype = Object.create(null);
InternalSymbol.prototype.constructor = InternalSymbol;
InternalSymbol.prototype.toString = function () {
    return "|" + this.name + "|";
};
if (Object.freeze) {
    Object.freeze(InternalSymbol.prototype);
}
var Enum = function (obj) {
    this._symbols = [];
    if (Array.isArray(obj)) {
        obj.forEach(function (name) {
            this[name] = new InternalSymbol(name);
            this._symbols.push(this[name]);
        }, this);
    }
    else {
        Object.keys(obj).forEach(function (name) {
            this[name] = new InternalSymbol(name, obj[name]);
            this._symbols.push(this[name]);
        }, this);
    }
    if (Object.freeze) {
        Object.freeze(this);
    }
};
Enum.prototype.toString = function (symbol) : string {
    if (this.contains(symbol)) {
        return symbol.toString();
    }

    throw new Error("symbol not part of this enum");
};
Enum.prototype.fromString = function (name : string) {
    if (name.substr(0, 1) === "|" && name.substr(-1, 1) === "|") {
        return this[name.substring(1, name.length - 1)];
    }

    return null;
};
Enum.prototype.symbols = function () {
    return this._symbols;
};
Enum.prototype.symbolPosition = function (symbol) {
    return this._symbols.indexOf(symbol);
};
Enum.prototype.contains = function (sym) : boolean {
    if (!(sym instanceof InternalSymbol)) {
        return false;
    }
    return this[sym.name] === sym;
};
Enum.prototype.Symbol = InternalSymbol;

export default Enum;
