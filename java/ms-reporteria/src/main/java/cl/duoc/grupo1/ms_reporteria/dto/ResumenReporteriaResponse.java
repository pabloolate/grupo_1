package cl.duoc.grupo1.ms_reporteria.dto;

import java.math.BigDecimal;

public class ResumenReporteriaResponse {
    private Long totalReclamos;
    private Long reclamosAbiertos;
    private Long reclamosCerrados;
    private Long reclamosDerivados;
    private Long reclamosConIa;
    private BigDecimal promedioMinutosPrimeraRespuesta;
    private BigDecimal promedioMinutosCierre;

    public Long getTotalReclamos() {
        return totalReclamos;
    }

    public void setTotalReclamos(Long totalReclamos) {
        this.totalReclamos = totalReclamos;
    }

    public Long getReclamosAbiertos() {
        return reclamosAbiertos;
    }

    public void setReclamosAbiertos(Long reclamosAbiertos) {
        this.reclamosAbiertos = reclamosAbiertos;
    }

    public Long getReclamosCerrados() {
        return reclamosCerrados;
    }

    public void setReclamosCerrados(Long reclamosCerrados) {
        this.reclamosCerrados = reclamosCerrados;
    }

    public Long getReclamosDerivados() {
        return reclamosDerivados;
    }

    public void setReclamosDerivados(Long reclamosDerivados) {
        this.reclamosDerivados = reclamosDerivados;
    }

    public Long getReclamosConIa() {
        return reclamosConIa;
    }

    public void setReclamosConIa(Long reclamosConIa) {
        this.reclamosConIa = reclamosConIa;
    }

    public BigDecimal getPromedioMinutosPrimeraRespuesta() {
        return promedioMinutosPrimeraRespuesta;
    }

    public void setPromedioMinutosPrimeraRespuesta(BigDecimal promedioMinutosPrimeraRespuesta) {
        this.promedioMinutosPrimeraRespuesta = promedioMinutosPrimeraRespuesta;
    }

    public BigDecimal getPromedioMinutosCierre() {
        return promedioMinutosCierre;
    }

    public void setPromedioMinutosCierre(BigDecimal promedioMinutosCierre) {
        this.promedioMinutosCierre = promedioMinutosCierre;
    }
}
