class A {
    static a(){
        return 2;
    }

    a(){
        return 3;
    }


}

var b = new A();
console.log(A.a());
console.log(b.a());