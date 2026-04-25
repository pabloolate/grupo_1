package cl.duoc.grupo1.ms_integracion_multicanal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CrearReclamoRequest {

    @NotBlank(message = "El nombre del cliente es obligatorio")
    @Size(max = 150)
    private String nombreCliente;

    @Email(message = "El correo del cliente no tiene formato valido")
    @Size(max = 150)
    private String correoCliente;

    @NotBlank(message = "El asunto es obligatorio")
    @Size(max = 255)
    private String asunto;

    @NotBlank(message = "El mensaje es obligatorio")
    private String mensaje;

    @Size(max = 80)
    private String canalOrigen;

    @Size(max = 255)
    private String identificadorExterno;

    public String getNombreCliente() { return nombreCliente; }
    public String getCorreoCliente() { return correoCliente; }
    public String getAsunto() { return asunto; }
    public String getMensaje() { return mensaje; }
    public String getCanalOrigen() { return canalOrigen; }
    public String getIdentificadorExterno() { return identificadorExterno; }

    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public void setCorreoCliente(String correoCliente) { this.correoCliente = correoCliente; }
    public void setAsunto(String asunto) { this.asunto = asunto; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
    public void setCanalOrigen(String canalOrigen) { this.canalOrigen = canalOrigen; }
    public void setIdentificadorExterno(String identificadorExterno) { this.identificadorExterno = identificadorExterno; }
}
