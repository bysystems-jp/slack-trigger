plugins {
    java
    application
    id("com.gradleup.shadow") version "9.4.1"
    id("com.diffplug.spotless") version "8.5.1"
    id("co.uzzu.dotenv.gradle") version "4.0.0"
}

repositories {
    mavenCentral()  
}

dependencies {
    implementation("com.fasterxml.jackson.core:jackson-databind:2.21.3")
    implementation("info.picocli:picocli:4.7.7")

    testImplementation("org.junit.jupiter:junit-jupiter:6.1.0")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:6.1.0")
}

application {
    mainClass = "jp.bysystems.slacktrigger.Main"
}

spotless {
    java {
        googleJavaFormat().aosp()
    }
}

tasks.run {
    env.allVariables().forEach { environment(it.key, it.value) }
}

tasks.test {
    env.allVariables().forEach { environment(it.key, it.value) }
    useJUnitPlatform()
}
