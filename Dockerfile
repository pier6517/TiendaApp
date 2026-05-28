FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip curl libpng-dev \
    libonig-dev libxml2-dev git \
    && docker-php-ext-install pdo pdo_mysql \
       mbstring exif pcntl bcmath gd zip \
    && apt-get clean

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader

RUN a2enmod rewrite

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 80