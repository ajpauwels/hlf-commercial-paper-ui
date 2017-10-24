module.exports = {
	ibm: {
		token: 'M5S5qRHH6DT6x6srShufyW6q4LjAEX111Nt6xNlfD7YVUIBksbE30rhTurD7b65V',
		port: 4200,
		displayName: 'IBM',
		staticDir: 'public',
		company: 'IBM',
		dbURL: 'mongodb://ajp:trainisland@ds227525.mlab.com:27525/cp-ui'
	},
	pbm: {
		token: '8DOf9Twnb7NhIaN6Y3Ldmfylbxb00heeHilOGnTTYYyHQrbLvoaDC3rHNCWsYzyS',
		port: 4201,
		displayName: 'PBM',
		staticDir: 'public',
		company: 'PBM',
		dbURL: 'mongodb://ajp:trainisland@ds227525.mlab.com:27525/cp-ui'
	},
	slurm: {
		token: 'YT3i0wsZsTDQR3cImBmEd1o5D3kkAvqHg7ljeRJtnYEesVi2ZmXuRhLqgwWQGTCj',
		port: 4202,
		displayName: 'Slurm',
		staticDir: 'public',
		company: 'Slurm',
		dbURL: 'mongodb://ajp:trainisland@ds227525.mlab.com:27525/cp-ui'
	},
	default: {
		token: '',
		port: 4200,
		displayName: 'Default',
		staticDir: 'public',
		company: 'Default',
		dbURL: 'mongodb://ajp:trainisland@ds227525.mlab.com:27525/cp-ui'
	}
}
