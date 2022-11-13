
var sam;
// **************************************************************************************************************
// model_generation

//FILE *observation_seq_file;
// **************************************************************************************************************

var p = 12;
let q = p;
let pi = 3.142857142857;
let frame_size = 320;
let scale_factor = 5000;
let temp = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
var N = 5;
let M = 32;
let codebook_size = M;
var T1 = 84; // max observation seq
let T = T1;

const alpha = [] //α
for(let i = 0; i < T1; ++i) {
	alpha.push(new Float64Array(p+1));
	for(let j = 0; j < N; ++j) {
		alpha[i][j] = parseFloat(0.0);
		//console.log(i, " ", j , " ", alpha[i][j]);
	}
		
} 
var probability = 0.0;

// static values of a, b, and codebook
// let x = [1,2,3,4,5,6,]

const _pi = [1.0, 0.0, 0.0, 0.0, 0.0];
const observation_seq = new Int32Array(T1*2);
let curr_digit;

// long double Si[50000] = {0};
// 	int sample_size = 0;
	let mini = Number.MAX_SAFE_INTEGER * 1.0;
	let maxi = Number.MIN_SAFE_INTEGER * 1.0;

let silence_size = silence.length;
const normalised_Si = new Float64Array(50000);
const DC_Shift_Si = new Float64Array(50000);
const Ri = new Float64Array(p+1);
const Ai = new Float64Array(p+1);
const Ci = new Float64Array(p+1);
const Ci_RSW = new Float64Array(p+1);
const avg_Ci_RSW = new Float64Array(p+1);
const weights_for_raised_sine_window = new Float64Array(p+1);

const energy = new Float64Array(500);
	let energy_size = 0;

let start, end; // index of voiced part of sample
let curr_frame;
let overlap_shift = 80;

let observation_seq_size = 0;

// ******************************* helper function *****************************************
const tokhura_weights = [1.0, 3.0, 7.0, 13.0, 19.0, 22.0, 25.0, 33.0, 42.0, 50.0, 56.0, 61.0];

function calculate_tokhuras_distance(A, B) {
	let res = 0.0;
	for(let i = 0; i < p; ++i) {
		const dist = A[i] - B[i];
		res += tokhura_weights[i]*dist*dist;
	}
	return res;
}


// *******************************************************************************************************
// for test purpose

function initialize_temp_with_Ci_RSW() {
	for(let i = 0; i < q; ++i) {
		temp[i] = Ci_RSW[i+1];
	}
}

function dump_observation() {
	let minDist = Number.MAX_SAFE_INTEGER;
	let index = 0;
	for(let j = 0; j < codebook_size; ++j) {
		const distance = calculate_tokhuras_distance(codebook[j], temp);
		//console.log("distance ", distance);
		if(minDist >= distance) {
			minDist = distance;
			index = j;
		}
	}
	console.log(`${index}`);
	observation_seq[observation_seq_size++] = index ;
}

// *******************************************************************************************************************

function DC_Shift_normalize(sample_size, sample) {

	let sum = parseFloat(0.0);
	for(let i = 0; i < silence_size; ++i) {
		sum += silence[i];
	}
	console.log("sum ", sum);
	
	const shift = sum / silence_size; // static value
	console.log("shift ", shift);
	for(let i = 0; i < sample_size; ++i) {
		DC_Shift_Si[i] = sample[i] - shift;
		//mini = Math.min(mini, Math.abs( sample[i]));
		maxi = Math.max(maxi, Math.abs(sample[i]));
	}

	for(let i = 0; i < sample_size; ++i) {
		// normalised_Si[i] = parseFloat(( DC_Shift_Si[i] - mini) / (maxi - mini))*scale_factor;
		normalised_Si[i] = parseFloat(DC_Shift_Si[i]*scale_factor/maxi);
	}
}

function extract_voiced_frames_from_normalised_sample(sample_size, sample) {

	let sum = normalised_Si[0] * normalised_Si[0];
	energy_size = 0;
	let maxEnergy = {energy : parseFloat(0), idx: 0};
    let noise_energy = 0.0; // avg energy

	for(let i = 1; i < sample_size; ++i) {
		if(i % frame_size == 0) {
			energy[energy_size++] = parseFloat(sum / frame_size);
            noise_energy += energy[energy_size-1];
			console.log(`energy ${energy_size-1} - ${energy[energy_size-1]}`)
			if(maxEnergy.energy < energy[energy_size-1]) {
				maxEnergy.energy = energy[energy_size-1]
				maxEnergy.idx = energy_size-1;
			}
            sum = 0;
		}
		//sum += normalised_Si[i] * normalised_Si[i];
		sum += normalised_Si[i] * normalised_Si[i];
	}

	// let noise_energy = 0; // avg energy
	// for(let i = 0; i < 3; ++i) { // earlier it was 3
	// 	noise_energy += energy[i];
	// }
	noise_energy /= energy_size;

	let energy_threshold = noise_energy * 3; //thresh
    console.log("energy_threshold ", energy_threshold)
	start = 0, end = energy_size;
	console.log(`end - start ${end} - ${start} ${end - start}`);
	for(let i = 0; i < energy_size - 5; ++i) {
		if(energy[i+1] >= energy_threshold && energy[i+2] >= energy_threshold && energy[i+3] >= energy_threshold && energy[i+4] >= energy_threshold) {
			start = i;
			break;
		}
	}
	for(let i = energy_size-1; i >= 4; --i) {
		if(energy[i-1] >= energy_threshold && energy[i-2] >= energy_threshold && energy[i-3] >= energy_threshold && energy[i-4] >= energy_threshold) {
			end = i;
			break;
		}
	}
	
	console.log(`end - start ${end} - ${start} ${end - start}`);

    if(end==-1) end=frame_size;
	diff=23-(end-start+1);
	start=parseInt(Math.max(0, start-(diff/2)));
	end=parseInt(Math.min(frame_size, end+(diff/2)));
	// if(end - start > 40) {
	// 	start = Math.max(start, maxEnergy.idx - 20)
	// 	end = Math.min(end, maxEnergy.idx + 20)
		

	// 	// const x = parseInt((end - start - 40) / 2);
	// 	// start += x;
	// 	// end -= x;
        
	// }


    const same = [];
    const dame = []
    for(let i = 0; i < sample_size; ++i)
        dame.push(sample[i])
    console.log(dame);

    let text = document.querySelector("#text");
    let x = ""
    for(let i = start * frame_size; i < end * frame_size; ++i)
    {
        x += sample[i] + "\n";
        same.push(sample[i])
    }
    console.log(same)
    // text.value = x;
    // sam.map(x => console.log(x))
    // console.log(sam)
	// console.log(`end - start ${end} - ${start} ${end - start}`);
}

function calculate_Ci_raised_sine_window() {
	for(let i = 1; i <= q; ++i) {
		weights_for_raised_sine_window[i] = 1 + (q/2.0)*Math.sin(pi*i/(1.0*q));
		Ci_RSW[i] = Ci[i]*weights_for_raised_sine_window[i];
		//console.log("CRSW",i, " ", Ai[i]);

	}
}

function calculate_Ci() {
    let sum = 0;
    const sigma = Ri[0];
    Ci[0] = Math.log(sigma*sigma);

    for(let i = 1; i <= p; ++i) {
        sum = 0;
        for(let j = 1; j < i; ++j) {
            sum += j*Ai[i-j]*Ci[j]/(i*1.0);
        }
        Ci[i] = Ai[i] + sum; 
		//console.log("C",i, " ", Ai[i]);

    }
}

function calculate_Ai() {
    const E = new Float64Array(p+1);
    const K = new Float64Array(p+1);
    const alpha = []
    
	for(let i = 0; i <= p; ++i) {
		alpha.push(new Float64Array(p+1));
		for(let j = 0; j <= p; ++j) {
			alpha[i][j] = parseFloat(0.0);
			//console.log(i, " ", j , " ", alpha[i][j]);
		}
			
	}
    let sum = 0;

    E[0] = Ri[0];

    K[1] = Ri[1]/Ri[0];
    alpha[1][1] = K[1];
    E[1] = (1 - K[1]*K[1])*E[0];

    for(let i = 1; i <= p; ++i) {
        sum = 0;
        for(let j = 1; j <= i-1; ++j) {
            sum += alpha[i-1][j]*Ri[i-j];
        }

        K[i] = (Ri[i] - sum) / E[i-1]; 
        alpha[i][i] = K[i];

        for(let j = 1; j <= i-1; ++j) {
            alpha[i][j] = alpha[i-1][j] - K[i]*alpha[i-1][i-j];
        }

        E[i] = (1 - K[i]*K[i])*E[i-1];
    }

    for(let i = 1; i <= p; ++i) {
        Ai[i] = alpha[p][i];
		//console.log("A",i, " ", Ai[i]);
    }
}

function calculate_Ri(sample) {
	let sample_start = curr_frame;
	let sample_end = sample_start + frame_size - 1;
	for(let i = 0; i <= p; ++i) {
		Ri[i] = parseFloat(0.0);
		for(let j = sample_start; j < sample_end - i; ++j) {
			Ri[i] += normalised_Si[j]*normalised_Si[j+i]; 
			//Ri[i] += DC_Shift_Si[j]*DC_Shift_Si[j+i];
		}
		
	}
	
}
function calculate_cepstral_coefficients(sample_size, sample) {
	DC_Shift_normalize(sample_size, sample);
	extract_voiced_frames_from_normalised_sample(sample_size, sample); // initializes start and end (frame no.)
	const start_idx = start * frame_size;
	const end_idx = (end-1) * frame_size;
	console.log("observation sequence");
	for(let i = start_idx ; i <= end_idx && observation_seq_size < T1; i += overlap_shift) { // observation sequence is limited to T (max size)
		curr_frame = i;
		calculate_Ri(sample);
		calculate_Ai();
		calculate_Ci();
		calculate_Ci_raised_sine_window(); // initializes Ci_RSW
		initialize_temp_with_Ci_RSW();
		dump_observation();
	}
}

function calculate_observation_seq(sample_size, sample) {
	calculate_cepstral_coefficients(sample_size, sample);
}
// *******************************************************************************************************************
// find probability
function initialize_aplha1() {
	for(let i = 0; i < N; ++i) {
		alpha[0][i] = parseFloat(_pi[i] * b[curr_digit][i][observation_seq[0]]);
        //console.log(alpha[0][i])
	}
}

function induce_alpha() {
	for(let t = 1; t < T; ++t) {
		for(let j = 0; j < N; ++j) {
			let sum = 0;
			for(let i = 0; i < N; ++i) {
				sum += parseFloat(alpha[t-1][i] * a[curr_digit][i][j]);
			}

			alpha[t][j] = parseFloat(sum * b[curr_digit][j][observation_seq[t]]);
		}
	}
}

function termination() {
	let probability = 0.0;
	for(let i = 0; i < N; ++i) {
		probability += parseFloat(alpha[T-1][i]);
	}
	return probability
}
function find_probability() {
	initialize_aplha1();
	induce_alpha();
	return termination();
}
function find_match() {
	let digit_with_max_probability = 0;
	let maximum_probability = parseFloat(-1);
	for(let d = 0; d < 10; ++d) {
		curr_digit = d;
		let probability = parseFloat(find_probability());
		if(probability > maximum_probability) {
			digit_with_max_probability = d;
			maximum_probability = probability;
		}
		console.log(`probability that digit is ${d} is `, probability);
	}
	return digit_with_max_probability;
}
// *******************************************************************************************************************

// *******************************************************************************************************
// this will be called by JS
function recognize(sample_size, sample) {
    
	//set_defaults(); // si, ri, ai, ci to default
	observation_seq_size = 0;
	calculate_observation_seq(sample_size, sample);
	T = observation_seq_size;
	//return sample[0];
	return find_match();
}