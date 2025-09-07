// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Navbar visibility and background change on scroll
let isNavbarVisible = false;
let lastScrollTop = 0;

window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    const heroSection = document.querySelector('.hero');
    const heroHeight = heroSection.offsetHeight;

    if (window.scrollY > heroHeight) {
        navbar.style.opacity = '1';
        navbar.style.transform = 'translateY(0)';
    } else {
        navbar.style.opacity = '0';
        navbar.style.transform = 'translateY(-100%)';
    }

    // Change navbar background opacity based on scroll position
    if (isNavbarVisible) {
        if (window.scrollY > 50) {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.backgroundColor = 'white';
            navbar.style.boxShadow = 'none';
        }
    }

    // Parallax effect for hero section
    const yPos = -window.scrollY * 0.3;
    heroSection.style.backgroundPositionY = yPos + 'px';

    lastScrollTop = window.scrollY;
});

// Ensure the navbar is hidden on initial load
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');
    navbar.style.opacity = '0';
    navbar.style.transform = 'translateY(-100%)';

    // Initialize statistics counters
    initializeCounters();
});

// Statistics counter animation
function initializeCounters() {
    const stats = document.querySelectorAll('.stat-number');
    const options = {
        threshold: 0.5
    };

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const value = parseInt(target.textContent);
                animateCounter(target, value);
                statsObserver.unobserve(target);
            }
        });
    }, options);

    stats.forEach(stat => statsObserver.observe(stat));
}

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50; // Adjust speed of counting
    const duration = 1500; // Animation duration in milliseconds
    const interval = duration / 50;

    const counter = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + '+';
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(current) + '+';
        }
    }, interval);
}

// Initiative cards animation
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            
            // Animate initiative stats after card appears
            const stats = entry.target.querySelectorAll('.initiative-stats span');
            stats.forEach((stat, index) => {
                setTimeout(() => {
                    stat.style.opacity = '1';
                    stat.style.transform = 'translateX(0)';
                }, index * 200);
            });
        }
    });
}, observerOptions);

document.querySelectorAll('.initiative-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.5s ease';
    
    // Initialize initiative stats
    const stats = card.querySelectorAll('.initiative-stats span');
    stats.forEach(stat => {
        stat.style.opacity = '0';
        stat.style.transform = 'translateX(-20px)';
        stat.style.transition = 'all 0.5s ease';
    });
    
    observer.observe(card);
});

// Contact form handling with animation
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    const formGroups = contactForm.querySelectorAll('.form-group');
    
    formGroups.forEach(group => {
        const input = group.querySelector('input, textarea');
        const icon = group.querySelector('i');
        
        input.addEventListener('focus', () => {
            icon.style.color = 'var(--primary-color)';
            icon.style.transform = 'translateY(-50%) scale(1.2)';
        });
        
        input.addEventListener('blur', () => {
            icon.style.color = input.value ? 'var(--primary-color)' : '#ddd';
            icon.style.transform = 'translateY(-50%) scale(1)';
        });
    });

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const submitButton = this.querySelector('.submit-button');
        const originalText = submitButton.innerHTML;
        
        // Animate button on submit
        submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';
        submitButton.disabled = true;
        
        // Simulate form submission (replace with actual form submission)
        setTimeout(() => {
            submitButton.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
            submitButton.style.backgroundColor = '#4CAF50';
            
            // Reset form after delay
            setTimeout(() => {
                this.reset();
                submitButton.innerHTML = originalText;
                submitButton.style.backgroundColor = '';
                submitButton.disabled = false;
                
                // Reset icons
                formGroups.forEach(group => {
                    const icon = group.querySelector('i');
                    icon.style.color = '#ddd';
                });
            }, 2000);
        }, 1500);
    });
}

// Mobile menu toggle with animation
let isMenuOpen = false;
const navLinks = document.querySelector('.nav-links');

function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    
    if (isMenuOpen) {
        navLinks.style.display = 'flex';
        setTimeout(() => {
            navLinks.style.opacity = '1';
            navLinks.style.transform = 'translateY(0)';
        }, 10);
    } else {
        navLinks.style.opacity = '0';
        navLinks.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            navLinks.style.display = 'none';
        }, 300);
    }
}

// Add mobile menu functionality if screen width is less than 768px
if (window.innerWidth < 768) {
    navLinks.style.display = 'none';
    navLinks.style.opacity = '0';
    navLinks.style.transform = 'translateY(-10px)';
    navLinks.style.transition = 'all 0.3s ease';
    
    const menuButton = document.createElement('button');
    menuButton.innerHTML = '☰';
    menuButton.className = 'menu-toggle';
    menuButton.style.cssText = `
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--primary-color);
        padding: 0.5rem;
        transition: transform 0.3s ease;
    `;
    
    menuButton.addEventListener('mouseover', () => {
        menuButton.style.transform = 'scale(1.1)';
    });
    
    menuButton.addEventListener('mouseout', () => {
        menuButton.style.transform = 'scale(1)';
    });
    
    document.querySelector('.navbar').appendChild(menuButton);
    menuButton.addEventListener('click', toggleMenu);
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth < 768 && isMenuOpen) {
            toggleMenu();
        }
    });
});

// Initiative Slider functionality
const slider = document.querySelector('.initiatives-slider');
const slides = document.querySelectorAll('.initiative-slide');
const dots = document.querySelectorAll('.slider-dot');
let currentSlide = 0;
let slideInterval;

function goToSlide(index) {
    currentSlide = index;
    slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    // Update active dot
    dots.forEach(dot => dot.classList.remove('active'));
    dots[currentSlide].classList.add('active');
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    goToSlide(currentSlide);
}

function startSlideShow() {
    slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
}

function stopSlideShow() {
    clearInterval(slideInterval);
}

// Initialize slider
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        goToSlide(index);
        stopSlideShow();
        startSlideShow();
    });
});

// Start automatic slideshow
startSlideShow();

// Pause slideshow on hover
slider.addEventListener('mouseenter', stopSlideShow);
slider.addEventListener('mouseleave', startSlideShow);

// Touch events for mobile
let touchStartX = 0;
let touchEndX = 0;

slider.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

slider.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left
            currentSlide = (currentSlide + 1) % slides.length;
        } else {
            // Swipe right
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        }
        goToSlide(currentSlide);
        stopSlideShow();
        startSlideShow();
    }
} 