function logb(x, b) {
	return Math.log(x) / Math.log(b);
}
function log2(x) {
	return Math.log(x) / Math.log(2);
}
function lastPow2(x) {
	return Math.floor(log2(x));
}
function closestPow2(x) {
	return Math.floor(log2(x) + .5);
}
function nextPow2(x) {
	return Math.ceil(log2(x));
}

var af = 27.5; //The value of A0 at 440 tuning.
var semitones = {
	"C" : 1,
	"C#" : 2,
	"Db" : 2,
	"D" : 3,
	"D#" : 4,
	"Eb" : 4,
	"E" : 5,
	"F" : 6,
	"F#" : 7,
	"Gb" : 7,
	"G" : 8,
	"G#" : 9,
	"Ab" : 9,
	"A" : 10,
	"A#" : 11,
	"Bb" : 11,
	"B" : 0,
	"B#" : 13
}


//Returns note frequency of a given note at a given octave. 
function getFreq(n, o) {
	return af * Math.pow(2, (semitones[n]-semitones.A)/12) * Math.pow(2, o);
}

function nextNote(f) {
	return f * Math.pow(2, 1/12);
}
//Returns a boolean value that confirms or denies that the given frequency is an octave of a specified note.
//f is frequency in Hz, n is a string note name, and t is how many Hz the specified note can be away from the "true" note.
//For example, with an FFT of bin width 2.15 Hz, tolerance should be >= 2.15 to correctly see if a bin is a certain note. 
function isNote(f, n, t) {
	return Math.abs(f - (Math.pow(2, closestPow2(f/getFreq(n, 0))) * getFreq(n, 0))) <= t;
}

//Returns if a frequency is any note.
function whatNote(f, t) {
	for(property in semitones)
		if(isNote(f, property, t))
			return property;
	return "NaN";
}
//Assumes that f is verified to be representative of n. Undefined results otherwise.
function getOctave(f, n) {
	return closestPow2(f/getFreq(n, 0));	
}