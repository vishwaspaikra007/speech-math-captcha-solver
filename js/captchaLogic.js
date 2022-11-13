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
            break;
        case 2:
            operand = "÷"
            ans = parseInt(maxi / mini);
            maxi = mini * ans;
            break;
    }   

    let captchaBox = document.querySelector("#form > div > span")
    captchaBox.innerHTML = `${maxi} ${operand} ${mini}`

    let captchaRefresh = document.querySelector("#form #refresh")
    captchaRefresh.style.transition = "ease 1s"
    captchaRefresh.style.transform = "rotate(360deg)"

    setTimeout(() => {
        captchaRefresh.style.transition = "0s"
        captchaRefresh.style.transform = "rotate(0deg)"
    }, 1000, captchaRefresh);
    
    // let img = document.createElement('div');
    // img.setAttribute("onclick", "generateCaptcha()")
    // img.setAttribute("alt", "iit logo")
    // captchaBox.appendChild(img)


    // captchaBox.innerHTML = arr[arr_i]
    
    // ans = arr[arr_i++]
    // if(arr_i == 10) arr_i = 0;
    // for testing comment out all above and comment out showContent() from app.js
}
// generateCaptcha()