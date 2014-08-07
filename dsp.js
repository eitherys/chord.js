/**********************************************************************************************/
/*  DSP Functions. Property of Nabeel Ansari.                                                 */
/**********************************************************************************************/

//Downsample the input array into equal size output array by an integer factor fs_k.
function downsample(input, output, fs_k) {
	if(input.length != output.length) {
		alert("Downsample I/O sizes not equal!");
		return;
	}

	ds_N = input.length / fs_k;
	for(var i = 0; i < output.length; i++)
	    if(i <= ds_N)
	        output[i] = input[i*fs_k]; //Get every kth sample.
	    else
	        output[i] = 0; //Zero-pad when no more samples are available.
}

//Returns the closest bin index to the frequency.
function closestBin(f, NSPC, nyq) {
	binwid = nyq/NSPC;
    for(var i = 0; i < NSPC; i++)
        if(Math.abs(f - i/NSPC*nyq) < binwid/2) 
            return i;
    return -1;
}

function hann(data, N) {
	for(var n = 0; n < N; n++)
		data[n] *= .54 - .46*Math.cos(2*Math.PI*n/N);
}