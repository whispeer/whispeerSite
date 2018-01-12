function copyOwnFrom(target: any, source: any) {
	Object.getOwnPropertyNames(source).forEach(function(propName) {
		Object.defineProperty(target, propName, Object.getOwnPropertyDescriptor(source, propName));
	});
	return target;
}

export class InternalSymbol {
	name: string;

	constructor(name: string, props?: any) {
		this.name = name;
		if (props) {
			copyOwnFrom(this, props);
		}
		if (Object.freeze) {
			Object.freeze(this);
		}
	}

	toString() {
		return "|" + this.name + "|";
	}
}

export default class Enum {
	[x: string]: InternalSymbol

	constructor(obj: any) {
		if (Array.isArray(obj)) {
			obj.forEach(function(name: string) {
				this[name] = new InternalSymbol(name)
			}, this);
		}
		else {
			Object.keys(obj).forEach(function(name) {
				this[name] = new InternalSymbol(name, obj[name])
			}, this);
		}
	}

	toString(symbol: InternalSymbol): string {
		if (this.contains(symbol)) {
			return symbol.toString();
		}

		throw new Error("symbol not part of this enum");
	};

	fromString(name: string): InternalSymbol {
		if (name.substr(0, 1) === "|" && name.substr(-1, 1) === "|") {
			const sym = this[name.substring(1, name.length - 1)];
			if (sym instanceof InternalSymbol) {
				return sym
			}
		}

		return null;
	};

	symbols(): InternalSymbol[] {
		return Object.keys(this).map((key) => this[key])
	};

	symbolPosition(symbol: InternalSymbol): number {
		return this.symbols().indexOf(symbol);
	};

	contains(sym: InternalSymbol): boolean {
		return this[sym.name] === sym;
	};
}
