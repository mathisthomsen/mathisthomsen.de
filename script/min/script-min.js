$(document).ready(function(){function e(){$(".slide").first().addClass("visible"),$(".next, .prev").click(function(){var e=$(this),i=$(".about-slider").find(".visible"),s=$(".about-slider").children().index(i),l=$(".slide").length;e.hasClass("next")?l-1>s?$(".visible").removeClass("visible").next().addClass("visible"):$(".slide").removeClass("visible").first().addClass("visible"):0===s?$(".slide").removeClass("visible").last().addClass("visible"):$(".visible").removeClass("visible").prev().addClass("visible")})}$(function(){e()}),$("#contact").click(function(){$(".slider-wrap").addClass("active"),$("#header").addClass("active")}),$("#back").click(function(){$(".slider-wrap").removeClass("active"),$("#header").removeClass("active")}),$("#music").click(function(){$(".overlay-music").addClass("active")}),$("#close-music").click(function(){$(".overlay-music").removeClass("active")}),$("#web").click(function(){$(".overlay-web").addClass("active")}),$("#close-web").click(function(){$(".overlay-web").removeClass("active")})});