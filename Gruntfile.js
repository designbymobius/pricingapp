module.exports = function(grunt){
	
		grunt.initConfig({

			// req vars
				pkg: grunt.file.readJSON('package.json'),

				srcDirectory: "src",
				debugDirectory: "debug",
				buildDirectory: "svelte",
				prodDirectory: "prod",

			// array of assets			
				coreJS: [],
				coreCSS: [],

		// Configure Plugins

			// jshint
				jshint: {
					options: {

						devel: true,
						browser: true,
						loopfunc: true,
						lastsemic: true
					},

					beforeconcat: '<%= coreJS %>'
				},

			// uglify
				uglify: {
			
					core_scripts: {
						files: {
							'<%= srcDirectory %>/js/min/core.min.js': '<%= coreJS %>'
						}
					}
				},

			// cssmin
				cssmin: {
					
					minify: {
						src: '<%= coreCSS %>',
						dest: '<%= srcDirectory %>/css/min/base.min.css'
					}
				},

			// htmlbuild
				htmlbuild: {

			        debug: {
			            src: '<%= srcDirectory %>/index.*', 
			            dest: '<%= debugDirectory %>/index.*',
			            options: {
			                scripts: {
			                    core: '<%= coreJS %>',
			                },
			                styles: {
			                    base: '<%= coreCSS %>',
			                }
			            }
			        },

			        production: {
			            src: '<%= srcDirectory %>/index.*', 
			            dest: '<%= buildDirectory %>/index.*',
			            options: {
			                
			                scripts: {
			                    core: '<%= srcDirectory %>/js/min/core.min.js',
			                },
			                
			                styles: {
			                    base: '<%= srcDirectory %>/css/min/base.min.css',
			                },
			                
			                collapseWhitespace: true
			            }
			        }
			    },

		// manifest
			manifest: {

				generate: {
					
					src: ['index.*'],
					dest: '<%= buildDirectory %>/manifest.appcache',
					options: {
						basePath:"<%= buildDirectory %>/",
						fallback: ["/ index.html"],
						network: ["*"],	
						preferOnline: true,
				        timestamp: true,
				        verbose: false,
					},				
				}
			},

		// watch
			watch: {

				js: {
					
					files: '<%= coreJS %>',
					tasks: ['jshint:beforeconcat', 'htmlbuild:debug', 'manifest', 'uglify', 'jshint:afterconcat', 'htmlbuild:production', 'copy:manifest' ]
				},

				css: {

					files: '<%= coreCSS %>',
					tasks: ['cssmin', 'htmlbuild', 'manifest', 'copy:manifest']
				},

				index: {

					files: '<%= srcDirectory %>/index.*',
					tasks: ['htmlbuild', 'manifest', 'copy:manifest']
				}

	        },

		});

	// Load Plugins	
		grunt.loadNpmTasks('grunt-contrib-jshint');
		grunt.loadNpmTasks('grunt-contrib-uglify');
		grunt.loadNpmTasks('grunt-contrib-cssmin'); 
		grunt.loadNpmTasks('grunt-contrib-watch');
		grunt.loadNpmTasks('grunt-contrib-copy');
		grunt.loadNpmTasks('grunt-html-build');
		grunt.loadNpmTasks('grunt-manifest');
}