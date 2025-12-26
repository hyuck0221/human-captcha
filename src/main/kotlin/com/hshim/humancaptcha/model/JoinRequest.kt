package com.hshim.humancaptcha.model

data class JoinRequest(
    val uuid: String,
    val language: String = "en"
)
