/**********************************************************************************************/
/*  Math functions relevent in sound and music.                                               */
/**********************************************************************************************/

//Quick floor and ceiling.
function cl(x) {
    return Math.ceil(x);
}
function fl(x) {
    return Math.floor(x);
}

//Easy logarithms.
function logb(x, b) {
	return Math.log(x) / Math.log(b);
}
function log2(x) {
	return logb(x, 2);
}

//Returns the decibel power of x.
function db(x) {
    return 10*logb(x, 10);
}

//Powers of 2.
function lastPow2(x) {
	return Math.floor(log2(x));
}
function closestPow2(x) {
	return Math.floor(log2(x) + .5);
}
function nextPow2(x) {
	return Math.ceil(log2(x));
}

/**********************************************************************************************/
/*  Musical note calculations.(Equal Temperament)                                             */                            
/**********************************************************************************************/
var tune = 440; //The frequency of A4. This is the basis of the tuning system.
var af = tune/Math.pow(2, 4); //The value of A0 at 440 tuning.
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
	"B" : 12
}

//Returns note frequency of a given note at a given octave. 
function getFreq(n, o) {
	return af * Math.pow(2, (semitones[n]-semitones.A)/12) * Math.pow(2, o);
}
//Returns the next semitone frequency of the given note, assuming it is tuned properly.
function nextNoteF(f) {
	return f * Math.pow(2, 1/12);
}
//Assumes that f is verified to be representative of n. Undefined results otherwise.
function getOctave(f, n) {
	return closestPow2(f/getFreq(n, 0));	
}

//Confirms or denies that the given frequency is an octave of a specified note. f is frequency
//in Hz, n is a note name, and t is how many Hz the specified note can be away from the "true" note.
function isNote(f, n, t) {
	return Math.abs(f - (Math.pow(2, closestPow2(f/getFreq(n, 0))) * getFreq(n, 0))) <= t;
}
//Returns the note associated with a given frequency, given a tolerance t.
function whatNote(f, t) {
	for(property in semitones)
		if(isNote(f, property, t))
			return property;
	return "Z";
}

var major_scale = ["1", "2", "3", "4", "5", "6", "7"];
var minor_scale = ["1", "2", "b3", "4", "5", "b6", "b7"];

function key(note, scale) {
	note_names=[];
	base = note[0];
	
	for(var i = 0; i < scale.length; i++) {
		semi_val = semitones[note].semitone_degree[scale[i]];
		next_base = nextbase(note[0]);
	}
}

function nextBase(note) {
	if(note=="A")
		return "B";
	else if(note=="B")
		return "C";
	else if(note=="C")
		return "D";
	else if(note=="D")
		return "E";
	else if(note=="E")
		return "F";
	else if(note=="F")
		return "G";
	else if(note=="G")
		return "A";
}

var semitone_degrees = {
	"1":0,
	"b2":1,
	"2":2,
	"b3":3, 
	"3":4,
	"4":5,
	"b5":6, 
	"5":7,
	"b6":8, 
	"6":9,
	"b7":10, 
	"7":11
};