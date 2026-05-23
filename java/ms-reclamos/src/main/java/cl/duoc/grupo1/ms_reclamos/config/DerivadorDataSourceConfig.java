package cl.duoc.grupo1.ms_reclamos.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@Configuration
public class DerivadorDataSourceConfig {

    @Bean(name = "derivadorJdbcTemplate")
    public JdbcTemplate derivadorJdbcTemplate(
            @Value("${derivador.datasource.url}") String url,
            @Value("${derivador.datasource.username}") String username,
            @Value("${derivador.datasource.password}") String password
    ) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return new JdbcTemplate(dataSource);
    }
}
