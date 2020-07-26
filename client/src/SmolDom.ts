export class SmolDom<T extends Record<string, HTMLElement>> {
    protected nodes?: T;

    constructor(protected nodeLookupMap: {[x in keyof T]: string}) {}

    public lookup(): this {
      this.nodes = Object.fromEntries(Object.entries(this.nodeLookupMap)
        .map(([key, value]: [keyof T, string]) => {
          const  el = document.getElementById(value);
          if(!el) throw new Error(`Could not find ${value}`);
          return [key, el];
        })) as {[x in keyof T]: T[x]}; // pogo lib dom
      return this;
    }

    public text(config: {[x in keyof T]?: string | null}): this {
      if(!this.nodes) return this;
      for(const [key, value] of Object.entries(config)) {
        this.nodes[key].textContent = value ?? null;
      }
      return this;
    }

    public prop<El extends HTMLElement, Key extends keyof El = keyof El>(prop: Key, config: {[x in keyof T]?: El[Key]}): this {
      if(!this.nodes) return this;
      for(const [key, value] of Object.entries(config)) {
        // @ts-expect-error
        this.nodes[key][prop] = value;
      }
      return this;
    }

    public removeClass(name: string, ...elements: Array<keyof T>): this {
        if(!this.nodes) return this;
        for (const el of elements) {
            this.nodes[el].classList.remove(name);
        }
        return this;
    }

    public addClass(name: string, ...elements: Array<keyof T>): this {
      if(!this.nodes) return this;
      for (const el of elements) {
        this.nodes[el].classList.add(name);
      }
      return this;
    }

    public conditionalClass(name: string, condition: boolean, ...elements: Array<keyof T>): this {
        if(!this.nodes) return this;
        const key = condition ? 'add' : 'remove';
        for (const el of elements) {
            this.nodes[el].classList[key](name);
        }
        return this;
    }

    public getElement<Key extends keyof T>(key: Key): T[Key] {
        if(!this.nodes) throw new Error('invalid state, no nodes');
        return this.nodes[key];
    }
}
