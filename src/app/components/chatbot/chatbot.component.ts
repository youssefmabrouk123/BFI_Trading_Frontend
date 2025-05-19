import { Component, ViewChild, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  isChatOpen = false;
  isMinimized = false;
  isEmojiPickerVisible = false;
  messages: Message[] = [];
  userInput = '';
  isLoading = false;
  hasUnreadMessages = false;
  maxMessageLength = 500;
  messageCharsLeft = this.maxMessageLength;
  private shouldScrollToBottom = true; // Initially true to scroll on first load

  private apiUrl = 'http://localhost:5000/api/v1/chatbot/chat';
  private destroy$ = new Subject<void>();
  private resizeObserver: ResizeObserver | null = null;

  initialSuggestions = [
    'What is EUR/USD?',
    'Explain forex trading',
    'Best trading hours?',
    'How to analyze charts?'
  ];

  quickSuggestions = [
    'Current market trends', // Fixed typo
    'Risk management tips',
    'Economic indicators',
    'Trading strategies'
  ];

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadMessages();
    this.checkUnreadMessages();
    setInterval(() => this.checkUnreadMessages(), 30000);
    this.setupTextAreaResize();

    // Set up debounced scroll event listener
    if (this.chatContainer) {
      fromEvent(this.chatContainer.nativeElement, 'scroll')
        .pipe(debounceTime(100), takeUntil(this.destroy$))
        .subscribe(() => this.onUserScroll());
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private setupTextAreaResize(): void {
    setTimeout(() => {
      if (this.messageInput) {
        this.resizeObserver = new ResizeObserver(() => {
          this.adjustTextareaHeight();
        });
        this.resizeObserver.observe(this.messageInput.nativeElement);
      }
    });
  }

  adjustTextareaHeight(): void {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  }

  private onUserScroll(): void {
    const container = this.chatContainer.nativeElement;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
    this.shouldScrollToBottom = isAtBottom;
    // console.log('Scroll event: shouldScrollToBottom =', this.shouldScrollToBottom);
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    this.isEmojiPickerVisible = false;

    if (this.isChatOpen) {
      this.isMinimized = false;
      this.hasUnreadMessages = false;
      setTimeout(() => {
        if (this.messageInput) {
          this.messageInput.nativeElement.focus();
        }
        this.shouldScrollToBottom = true;
        this.scrollToBottom();
      }, 100);
    }
  }

  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    if (!this.isMinimized) {
      this.shouldScrollToBottom = true;
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  onEnterPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading) return;

    if (this.userInput.length > this.maxMessageLength) {
      this.userInput = this.userInput.substring(0, this.maxMessageLength);
    }

    const userMessage: Message = {
      role: 'user',
      content: this.userInput,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.userInput = '';
    this.messageCharsLeft = this.maxMessageLength;
    this.isLoading = true;
    this.isEmojiPickerVisible = false;

    if (this.messageInput) {
      this.messageInput.nativeElement.style.height = 'auto';
      this.adjustTextareaHeight();
    }

    this.saveMessages();
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }

    const payload = {
      messages: [
        ...this.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ]
    };

    this.http.post<{ role: string, content: string }>(this.apiUrl, payload).subscribe({
      next: (response) => {
        const assistantResponse: Message = {
          role: 'assistant',
          content: response.content,
          timestamp: new Date()
        };

        this.messages.push(assistantResponse);
        this.isLoading = false;
        this.saveMessages();

        if (!this.isChatOpen || document.hidden) {
          this.hasUnreadMessages = true;
          this.notifyUser('New message from Forex Assistant');
        }

        if (this.shouldScrollToBottom) {
          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: (error) => {
        console.error('Chat error:', error);
        this.messages.push({
          role: 'assistant',
          content: 'Sorry, I couldn\'t connect to the server. Please check your connection and try again.',
          timestamp: new Date()
        });
        this.isLoading = false;
        this.saveMessages();
        if (this.shouldScrollToBottom) {
          this.scrollToBottom();
        }
      }
    });
  }

  useQuickSuggestion(suggestion: string): void {
    this.userInput = suggestion;
    if (this.messageInput) {
      this.messageInput.nativeElement.focus();
    }
    this.sendMessage();
  }

  clearChat(): void {
    if (confirm('Are you sure you want to clear all chat messages?')) {
      this.messages = [];
      localStorage.removeItem('forexChatMessages');
      this.shouldScrollToBottom = true;
      this.scrollToBottom();
    }
  }

  formatMessage(content: string): SafeHtml {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const withLinks = content.replace(urlRegex, '<a href="$1" target="_blank" class="text-[var(--accent-color)] underline">$1</a>');
    let formatted = withLinks
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">$1</code>');
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  formatMessageTime(timestamp?: Date): string {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(new Date(timestamp));
  }

  formatMessageDate(timestamp?: Date): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      }).format(date);
    }
  }

  showDateSeparator(index: number): boolean {
    if (index === 0) return true;
    if (index > 0 && this.messages[index].timestamp && this.messages[index - 1].timestamp) {
      const prevDate = new Date(this.messages[index - 1].timestamp);
      const currDate = new Date(this.messages[index].timestamp);
      return prevDate.toDateString() !== currDate.toDateString();
    }
    return false;
  }

  private saveMessages(): void {
    const messagesToSave = this.messages.slice(-100);
    localStorage.setItem('forexChatMessages', JSON.stringify(messagesToSave));
  }

  private loadMessages(): void {
    const savedMessages = localStorage.getItem('forexChatMessages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        }));
      } catch (error) {
        console.error('Error parsing saved messages:', error);
        localStorage.removeItem('forexChatMessages');
      }
    }
  }

  private checkUnreadMessages(): void {
    if (!this.isChatOpen && this.messages.length > 0) {
      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage.role === 'assistant') {
        const lastMessageTime = new Date(lastMessage.timestamp).getTime();
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - lastMessageTime;
        if (timeDiff < 5 * 60 * 1000) {
          this.hasUnreadMessages = true;
        }
      }
    }
  }

  private notifyUser(message: string): void {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Forex Assistant', {
          body: message,
          icon: 'assets/images/forex-icon.png'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Forex Assistant', {
              body: message,
              icon: 'assets/images/forex-icon.png'
            });
          }
        });
      }
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer && !this.isMinimized && this.shouldScrollToBottom) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        // console.log('Scrolled to bottom');
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.isEmojiPickerVisible) {
      this.isEmojiPickerVisible = false;
    } else if (this.isChatOpen) {
      this.toggleChat();
    }
  }

  @HostListener('input', ['$event'])
  onInputChange(event: Event): void {
    this.messageCharsLeft = this.maxMessageLength - this.userInput.length;
    this.adjustTextareaHeight();
  }

  @HostListener('window:focus', ['$event'])
  onWindowFocus(event: FocusEvent): void {
    if (this.isChatOpen) {
      this.hasUnreadMessages = false;
    }
  }
}