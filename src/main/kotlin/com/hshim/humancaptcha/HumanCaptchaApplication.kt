package com.hshim.humancaptcha

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@EnableScheduling
@SpringBootApplication
class HumanCaptchaApplication

fun main(args: Array<String>) {
    runApplication<HumanCaptchaApplication>(*args)
}
