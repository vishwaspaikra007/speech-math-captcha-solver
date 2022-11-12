var ans
let arr = [0,1,2,3,4,5,6,7,8,9];
let arr_i = 0

function generateCaptcha() {
    let x = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0]
    // let xa = [1, 2, 2, 2, 3];
    // let xb = [9, 1, 3, 4, 1]

    let a = parseInt(Math.random() * 10)
    let b = parseInt(Math.random() * 10)

    let maxi = Math.max(a, b)
    let mini = Math.min(a, b)

    if(mini == 0) mini += 1

    let operand = "+"

    switch(x[parseInt(Math.random()*10)]) {
        case 0: 
            operand = "+"
            ans = maxi + mini
            if(ans > 9) {
                ans = maxi - mini
                operand = "-"
            }
            break;
        case 1:
            operand = "*"
            ans = parseInt(maxi / mini);
            maxi = ans;
            ans = maxi * mini;
        case 2:
            operand = "÷"
            ans = parseInt(maxi / mini);
            maxi = mini * ans;
    }   

    let captchaBox = document.querySelector("#form > span")
    captchaBox.innerHTML = `${maxi} ${operand} ${mini}`


    // captchaBox.innerHTML = arr[arr_i]
    
    // ans = arr[arr_i++]
    // if(arr_i == 10) arr_i = 0;
    // for testing comment out all above and comment out showContent() from app.js
}
// generateCaptcha()