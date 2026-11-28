import java.io.File

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val workspaceBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()

// Hindari korupsi file AAPT2/Gradle akibat sinkronisasi OneDrive (cldflt.sys) di Windows
val isOneDrive: Boolean = rootProject.projectDir.absolutePath.contains("OneDrive", ignoreCase = true)
val newBuildDir: Directory = if (isOneDrive) {
    val localBase = System.getenv("LOCALAPPDATA") ?: System.getProperty("java.io.tmpdir")
    val cacheFile = File(localBase, "cermat_tani_gradle_build")
    cacheFile.mkdirs()
    rootProject.objects.directoryProperty().fileValue(cacheFile).get()
} else {
    workspaceBuildDir
}
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)

    if (isOneDrive && project.name == "app") {
        afterEvaluate {
            tasks.matching { it.name.startsWith("assemble") }.configureEach {
                doLast {
                    val srcApkDir = newBuildDir.dir("app/outputs/flutter-apk").asFile
                    val dstApkDir = workspaceBuildDir.dir("app/outputs/flutter-apk").asFile
                    if (srcApkDir.exists()) {
                        dstApkDir.mkdirs()
                        srcApkDir.copyRecursively(dstApkDir, overwrite = true)
                    }
                }
            }
        }
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
    delete(workspaceBuildDir)
}
