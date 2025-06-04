// 전역 변수 및 상수
let slideIndex = 1;
let touchStartX = 0;
let touchEndX = 0;
const modalElement = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const googleScriptUrl = "https://script.google.com/macros/s/AKfycbxOYPrBfGxApYH-8ffsgxJwjHc380NAyJPmZcy52YoDW-2wnShRLuK0KIxLMJyIo1sKCQ/exec";

// 초기화 함수 - DOMContentLoaded에서 모든 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    initializeGallery();
    initializeModal();
    initializeGuestbook();
    preloadImages();
});

// 갤러리 초기화 - 카카오톡 인앱 브라우저 호환성 개선
function initializeGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach((item, index) => {
        // 여러 이벤트 타입을 동시에 등록하여 호환성 개선
        const events = ['click', 'touchend', 'touchstart'];
        
        events.forEach(eventType => {
            item.addEventListener(eventType, function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // touchstart는 모달을 열지 않고 단순히 활성화만
                if (eventType === 'touchstart') {
                    item.style.borderColor = 'var(--main-color)';
                    return;
                }
                
                // click과 touchend에서 모달 열기
                if (eventType === 'click' || eventType === 'touchend') {
                    console.log('Gallery item clicked/touched:', index + 1);
                    openModal();
                    currentSlide(index + 1);
                }
            }, { passive: false });
        });
        
        // 터치 이벤트 종료 시 스타일 초기화
        item.addEventListener('touchcancel', function() {
            item.style.borderColor = 'transparent';
        });
        
        // 마우스 리브 시 스타일 초기화 (데스크톱용)
        item.addEventListener('mouseleave', function() {
            item.style.borderColor = 'transparent';
        });
        
        // 포커스 이벤트 추가 (키보드 네비게이션 지원)
        item.setAttribute('tabindex', '0');
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal();
                currentSlide(index + 1);
            }
        });
    });
    
    // 카카오톡 인앱 브라우저 감지 및 대체 이벤트 등록
    if (isKakaoInAppBrowser()) {
        console.log('카카오톡 인앱 브라우저 감지됨');
        addKakaoCompatibilityFixes();
    }
}

// 카카오톡 인앱 브라우저 감지 함수
function isKakaoInAppBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('kakaotalk') || 
           userAgent.includes('kakao') ||
           (userAgent.includes('mobile') && window.DeviceMotionEvent === undefined);
}

// 카카오톡 호환성 수정 함수
function addKakaoCompatibilityFixes() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach((item, index) => {
        // 대체 이벤트 핸들러 추가
        item.addEventListener('mousedown', function(e) {
            setTimeout(() => {
                openModal();
                currentSlide(index + 1);
            }, 100);
        });
        
        // 더블탭 이벤트 지원
        let tapCount = 0;
        item.addEventListener('touchend', function(e) {
            tapCount++;
            if (tapCount === 1) {
                setTimeout(() => {
                    if (tapCount === 1) {
                        openModal();
                        currentSlide(index + 1);
                    }
                    tapCount = 0;
                }, 300);
            }
        });
    });
}

// 모달 초기화
function initializeModal() {
    const modalContainer = document.querySelector('.modal-container');
    if (modalContainer) {
        modalContainer.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        
        modalContainer.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);
    }
    
    // 모달 외부 클릭 시 닫기
    window.onclick = function(event) {
        if (event.target == modalElement) {
            closeModal();
        }
    }
    
    // 키보드 네비게이션
    document.onkeydown = function(e) {
        if (modalElement.style.display === "flex") {
            if (e.key === "ArrowLeft") {
                plusSlides(-1);
            } else if (e.key === "ArrowRight") {
                plusSlides(1);
            } else if (e.key === "Escape") {
                closeModal();
            }
        }
    }
}

// 방명록 초기화
function initializeGuestbook() {
    const guestbookForm = document.getElementById('guestbookForm');
    if (guestbookForm) {
        guestbookForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('guestName').value;
            const message = document.getElementById('guestMessage').value;
            
            if (name && message) {
                saveGuestbookEntry(name, message);
                sendToSlack(name, message);
                guestbookForm.reset();
            }
        });
    }
}

// 이미지 프리로드
function preloadImages() {
    const galleryImages = document.querySelectorAll('.gallery-item img');
    galleryImages.forEach(img => {
        const preloadImg = new Image();
        preloadImg.src = img.src;
    });
}

// 모달 관련 함수들
function openModal() {
    modalElement.style.display = "flex";
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.overflow = 'hidden';
    document.body.dataset.scrollY = scrollY;
}

function closeModal() {
    modalElement.style.display = "none";
    const scrollY = document.body.dataset.scrollY;
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.body.style.overflow = '';
    window.scrollTo(0, parseInt(scrollY || '0'));
}

function plusSlides(n) {
    slideIndex += n;
    showSlides();
}

function currentSlide(n) {
    slideIndex = n;
    showSlides();
}

function showSlides() {
    const galleryImages = document.querySelectorAll('.gallery-item img');
    const totalImages = galleryImages.length;
    
    if (slideIndex > totalImages) {
        slideIndex = 1;
    }
    if (slideIndex < 1) {
        slideIndex = totalImages;
    }
    
    modalImage.src = '';
    const img = new Image();
    img.onload = function() {
        modalImage.src = this.src;
    };
    img.src = galleryImages[slideIndex-1].src;
}

function handleSwipe() {
    if (touchEndX < touchStartX - 50) {
        plusSlides(1);
    } else if (touchEndX > touchStartX + 50) {
        plusSlides(-1);
    }
}

// 방명록 관련 함수들
function saveGuestbookEntry(name, message) {
    const entries = JSON.parse(localStorage.getItem('weddingGuestbook') || '[]');
    const newEntry = {
        name: name,
        message: message,
        date: new Date().toISOString()
    };
    entries.push(newEntry);
    localStorage.setItem('weddingGuestbook', JSON.stringify(entries));
}

function sendToSlack(name, message) {
    const data = {
        name: name,
        message: message,
        date: formatDate(new Date())
    };
    
    const url = new URL(googleScriptUrl);
    url.searchParams.append('name', data.name);
    url.searchParams.append('message', data.message);
    url.searchParams.append('date', data.date);

    fetch(url.toString(), {
        method: 'GET',
        mode: 'no-cors',
    })
    .then(() => {
        console.log("슬랙 요청 완료");
        showNotification("축하 메시지가 전송되었습니다. 감사합니다! 💌");
    })
    .catch(error => {
        console.error("슬랙 요청 오류:", error);
        showNotification("축하 메시지가 저장되었습니다. 감사합니다! 💌");
    });
}

// 유틸리티 함수들
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('링크가 클립보드에 복사되었습니다.');
    }).catch(() => {
        // 폴백
        const dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = url;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        alert('링크가 클립보드에 복사되었습니다.');
    });
}

function showNotification(message) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--main-color)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '30px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: '1000',
        fontSize: '14px',
        fontWeight: '500',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
