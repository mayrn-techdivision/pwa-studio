// this job will run in a container based on the image
// specified in the devfile.yaml (if specified)
job("Build Idea indexes") {
    warmup(ide = Ide.PhpStorm) {
        devfile = ".space/devfile.yaml"
    }
}
