from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from config import settings
from models import Base

def clean_database_url(url: str) -> str:
    """Remove unsupported parameters for psycopg2 from Supabase connection string"""
    if not url:
        return url
    
    parsed = urlparse(url)
    
    # Parse query parameters
    query_params = parse_qs(parsed.query)
    
    # Remove parameters not supported by psycopg2
    unsupported_params = ['prepared_statement_cache_size', 'statement_cache_size']
    for param in unsupported_params:
        query_params.pop(param, None)
    
    # Flatten single-value lists (parse_qs returns lists)
    cleaned_params = {k: v[0] if len(v) == 1 else v for k, v in query_params.items()}
    
    # Rebuild URL
    new_query = urlencode(cleaned_params, doseq=True)
    cleaned_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))
    
    return cleaned_url

class Database:
    _instance = None
    _engine = None
    _SessionLocal = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def connect(self):
        """Connect to PostgreSQL and create tables"""
        if self._engine is None:
            # Clean URL to remove unsupported parameters
            db_url = clean_database_url(settings.DATABASE_URL)
            
            self._engine = create_engine(
                db_url,
                poolclass=QueuePool,
                pool_pre_ping=True,        # Check connection health before use
                pool_size=5,               # Base connections (reduced for Supabase limits)
                max_overflow=10,           # Max additional connections under load
                pool_timeout=10,           # Wait timeout for connection from pool
                pool_recycle=1800,         # Recycle connections after 30 minutes
                echo=False,                # Disable SQL logging for performance
                connect_args={
                    "sslmode": "require",
                    "connect_timeout": 3,
                }
            )
            self._SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self._engine)
            
            # Enable vector extension
            try:
                with self._engine.connect() as conn:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                    conn.commit()
            except Exception as e:
                print(f"⚠️ Warning: Could not enable pgvector extension: {e}")
                print("   (This is expected if using Supabase Transaction Pooler. Ensure 'vector' extension is enabled in Supabase Dashboard)")
            
            # Create tables
            try:
                Base.metadata.create_all(bind=self._engine)
                print(f"[OK] Connected to PostgreSQL (Supabase)")
            except Exception as e:
                print(f"[ERROR] Error creating tables: {e}")
                print("   (Check your database connection string and permissions)")

    def get_session(self) -> Session:
        if self._SessionLocal is None:
            self.connect()
        return self._SessionLocal()

    def close(self):
        if self._engine:
            self._engine.dispose()
            self._engine = None
            print("[SHUTDOWN] PostgreSQL connection closed")

db = Database()
