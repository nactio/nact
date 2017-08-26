export default class Effect {
    constructor(f, async){
        this.f = f;
        this.async = !!async;
    }
}