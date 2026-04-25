package cl.duoc.grupo1.ms_usuarios_autenticacion.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Email String correo,
        @NotBlank String password
) {}
