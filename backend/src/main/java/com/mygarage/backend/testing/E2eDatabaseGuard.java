package com.mygarage.backend.testing;

import javax.sql.DataSource;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.*;

@Configuration @Profile({"e2e", "test"})
public class E2eDatabaseGuard {
    // Verify immediately after DataSource creation, before Hibernate can run schema DDL.
    @Bean static BeanPostProcessor isolatedDataSourceGuard() {
        return new BeanPostProcessor() {
            @Override public Object postProcessAfterInitialization(Object bean, String name) throws BeansException {
                if (bean instanceof DataSource source) {
                    try (var connection=source.getConnection(); var statement=connection.createStatement();
                         var rows=statement.executeQuery("select current_database(), current_user, (select rolsuper from pg_roles where rolname=current_user)")) {
                        if (!rows.next() || !"mygarage_e2e".equals(rows.getString(1)) || !"mygarage_e2e".equals(rows.getString(2)) || rows.getBoolean(3))
                            throw new IllegalStateException("Refusing non-isolated database before schema initialization");
                    } catch (java.sql.SQLException error) { throw new IllegalStateException("Cannot verify isolated PostgreSQL", error); }
                }
                return bean;
            }
        };
    }
}
