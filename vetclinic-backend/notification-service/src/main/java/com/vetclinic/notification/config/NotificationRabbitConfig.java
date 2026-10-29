package com.vetclinic.notification.config;

import com.vetclinic.common.event.EventRouting;
import com.vetclinic.common.event.RabbitCommonConfig;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/** Queue của notification-service: &lt;service&gt;.&lt;routing-key&gt;, bền vững, mỗi queue có DLQ; nghe cả 6 sự kiện. */
@Configuration
public class NotificationRabbitConfig {

    public static final String SERVICE_NAME = "notification-service";
    // Phải là hằng số compile-time (dùng trong @RabbitListener)
    public static final String APPOINTMENT_CREATED_QUEUE = SERVICE_NAME + "." + EventRouting.APPOINTMENT_CREATED;
    public static final String APPOINTMENT_STATUS_QUEUE = SERVICE_NAME + "." + EventRouting.APPOINTMENT_STATUS_CHANGED;
    public static final String VISIT_CHECKED_IN_QUEUE = SERVICE_NAME + "." + EventRouting.VISIT_CHECKED_IN;
    public static final String PRIORITY_CALLBACK_QUEUE = SERVICE_NAME + "." + EventRouting.DOCTOR_PRIORITY_CALLBACK;
    public static final String VISIT_CLOSED_QUEUE = SERVICE_NAME + "." + EventRouting.VISIT_CLOSED_TO_PAYMENT;
    public static final String PAYMENT_COMPLETED_QUEUE = SERVICE_NAME + "." + EventRouting.PAYMENT_COMPLETED;
    public static final String LOW_STOCK_QUEUE = SERVICE_NAME + "." + EventRouting.STOCK_LOW_ALERT;

    @Bean
    public Declarables notificationQueues(TopicExchange clinicEventsExchange, DirectExchange clinicEventsDeadLetterExchange) {
        List<Object> declarations = new ArrayList<>();
        String[][] queues = {
                {APPOINTMENT_CREATED_QUEUE, EventRouting.APPOINTMENT_CREATED},
                {APPOINTMENT_STATUS_QUEUE, EventRouting.APPOINTMENT_STATUS_CHANGED},
                {VISIT_CHECKED_IN_QUEUE, EventRouting.VISIT_CHECKED_IN},
                {PRIORITY_CALLBACK_QUEUE, EventRouting.DOCTOR_PRIORITY_CALLBACK},
                {VISIT_CLOSED_QUEUE, EventRouting.VISIT_CLOSED_TO_PAYMENT},
                {PAYMENT_COMPLETED_QUEUE, EventRouting.PAYMENT_COMPLETED},
                {LOW_STOCK_QUEUE, EventRouting.STOCK_LOW_ALERT},
        };
        for (String[] entry : queues) {
            String queueName = entry[0];
            org.springframework.amqp.core.Queue queue = RabbitCommonConfig.durableQueueWithDlq(queueName);
            org.springframework.amqp.core.Queue deadLetterQueue = RabbitCommonConfig.deadLetterQueue(queueName);
            Binding binding = BindingBuilder.bind(queue).to(clinicEventsExchange).with(entry[1]);
            Binding deadLetterBinding = BindingBuilder.bind(deadLetterQueue).to(clinicEventsDeadLetterExchange).with(queueName);
            declarations.addAll(List.of(queue, deadLetterQueue, binding, deadLetterBinding));
        }
        return new Declarables(declarations.stream().map(o -> (org.springframework.amqp.core.Declarable) o).toList());
    }
}
