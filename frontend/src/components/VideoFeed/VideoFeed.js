import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Heart, MessageCircle, Share2, ShoppingBag, X, Zap, Volume2, VolumeX } from "lucide-react";
import ReactPlayer from 'react-player';
import { toastSuccess } from "../../utils/toast";
import { formatPrice } from "../../utils/format";
import { generateProductUrl } from "../../utils/productUrl";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

// Video Component Helper to handle the play() promise correctly
const SingleVideo = ({ video, isActive, index, setVideoErrors, isMuted }) => {
    const videoRef = useRef(null);
    const isExternal = video.video_url?.startsWith('http');

    useEffect(() => {
        if (!videoRef.current || isExternal) return;

        if (isActive) {
            // Use a slight delay to ensure the browser has registered the intention to play
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Ignore abort errors which are common with fast scrolling
                    if (error.name !== 'AbortError') {
                        console.error("Playback failed:", error);
                    }
                });
            }
        } else {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [isActive, isExternal]);

    if (isExternal) {
        return (
            <ReactPlayer
                url={video.video_url}
                playing={isActive}
                loop
                muted={isMuted}
                width="100%"
                height="100%"
                playsinline
                config={{
                    youtube: { playerVars: { showinfo: 0, modestbranding: 1, rel: 0, controls: 0 } },
                    file: { attributes: { style: { objectFit: 'cover', width: '100%', height: '100%' } } }
                }}
                onError={() => setVideoErrors(prev => ({ ...prev, [index]: true }))}
            />
        );
    }

    return (
        <video
            ref={videoRef}
            src={`${API_BASE_URL}${video.video_url}`}
            poster={video.thumbnail_url?.startsWith('http') ? video.thumbnail_url : (video.thumbnail_url ? `${API_BASE_URL}${video.thumbnail_url}` : null)}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            onError={() => setVideoErrors(prev => ({ ...prev, [index]: true }))}
        />
    );
};

const VideoFeed = ({ onClose }) => {
    const [videos, setVideos] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [debouncedIndex, setDebouncedIndex] = useState(0);
    const [videoErrors, setVideoErrors] = useState({});
    const [showComments, setShowComments] = useState(false);
    const [currentComments, setCurrentComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [commentLoading, setCommentLoading] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    const containerRef = useRef(null);
    const scrollTimeout = useRef(null);
    const navigate = useNavigate();
    const token = localStorage.getItem("userToken");

    const fetchVideos = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/videos`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setVideos(res.data);
        } catch (err) {
            console.error("Error fetching video feed", err);
        }
    }, [token]);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);

        // Immediate index update for UI responsiveness (but not playback)
        setActiveIndex(index);

        // Debounced activation for playback to prevent AbortError
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            setDebouncedIndex(index);
        }, 250);
    };

    useEffect(() => {
        return () => {
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, []);

    const handleLike = async (videoId, index) => {
        if (!token) return toastSuccess("Please login to like videos!");
        try {
            const res = await axios.post(`${API_BASE_URL}/api/videos/${videoId}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedVideos = [...videos];
            if (res.data.liked) {
                updatedVideos[index].likes_count++;
                updatedVideos[index].is_liked = true;
            } else {
                updatedVideos[index].likes_count--;
                updatedVideos[index].is_liked = false;
            }
            setVideos(updatedVideos);
        } catch (err) {
            console.error("Like failed", err);
        }
    };

    const fetchComments = async (videoId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/videos/${videoId}/comments`);
            setCurrentComments(res.data);
            setShowComments(true);
        } catch (err) {
            console.error("Fetch comments failed");
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!token) return toastSuccess("Please login to comment!");
        if (!newComment.trim()) return;

        setCommentLoading(true);
        try {
            const videoId = videos[activeIndex].id;
            await axios.post(`${API_BASE_URL}/api/videos/${videoId}/comments`,
                { comment: newComment },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewComment("");
            fetchComments(videoId);
            const updatedVideos = [...videos];
            updatedVideos[activeIndex].comments_count++;
            setVideos(updatedVideos);
        } catch (err) {
            console.error("Post comment failed");
        } finally {
            setCommentLoading(false);
        }
    };

    const handleShare = async (video) => {
        const shareData = {
            title: video.caption || video.product_name,
            text: `Check out this product on Shopkart: ${video.product_name}`,
            url: `${window.location.origin}/product/${video.product_slug}`,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                toastSuccess("Product link copied to clipboard!");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Share failed", err);
            }
        }
    };

    if (!videos.length) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black flex justify-center">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 text-white bg-black/50 p-2 rounded-full hover:bg-black/70"
            >
                <X size={24} />
            </button>

            {/* Video Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="w-full max-w-md h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-gray-900"
            >
                {videos.map((video, index) => (
                    <div key={video.id} className="w-full h-full snap-start relative flex items-center justify-center bg-black">
                        {videoErrors[index] ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 border-2 border-dashed border-gray-800 p-8 text-center">
                                <ShoppingBag size={48} className="text-gray-700 mb-4 animate-pulse" />
                                <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-widest">Preview Unavailable</p>
                                <p className="text-[10px] text-gray-600 max-w-[200px]">We're having trouble loading this video preview. Tap below to shop the product.</p>
                            </div>
                        ) : (
                            <div className="player-wrapper">
                                <SingleVideo
                                    video={video}
                                    isActive={index === debouncedIndex}
                                    index={index}
                                    setVideoErrors={setVideoErrors}
                                    isMuted={isMuted}
                                />
                                <div
                                    className="absolute inset-0 z-0 bg-transparent"
                                    onClick={() => setIsMuted(prev => !prev)}
                                />
                            </div>
                        )}

                        {/* Audio Toggle Floating Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMuted(!isMuted);
                            }}
                            className="absolute top-4 left-4 z-50 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 flex items-center gap-2"
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>

                        {/* Floating Group Deal Badge */}
                        {video.group_buy_id && (
                            <div className="absolute top-20 left-4 z-30 animate-bounce">
                                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-[1px] rounded-full shadow-lg">
                                    <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/20">
                                        <div className="bg-yellow-400 p-0.5 rounded-full">
                                            <Zap size={10} className="text-black fill-black" />
                                        </div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Group Deal Live</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Overlay Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white z-20">
                            <h3 className="text-lg font-bold mb-1">{video.caption || video.product_name}</h3>
                            <p className="text-sm opacity-90 mb-4 line-clamp-2">{video.product_name}</p>

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-yellow-400">
                                        {formatPrice(video.product_sale_price || video.product_price)}
                                    </span>
                                    {video.product_sale_price && (
                                        <span className="text-xs text-gray-400 !line-through">{formatPrice(video.product_price)}</span>
                                    )}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Mock product object for URL generation
                                        const mockProduct = {
                                            slug: video.product_slug,
                                            shop_id: video.shop_id || null // Ensure shop_id is passed if available in video object
                                        };
                                        navigate(generateProductUrl(mockProduct));
                                        onClose();
                                    }}
                                    className="bg-[#dc3545] text-white px-6 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-red-700 transition-colors"
                                >
                                    <ShoppingBag size={18} />
                                    Shop Now
                                </button>
                            </div>
                        </div>

                        {/* Right Sidebar Actions */}
                        <div className="absolute right-4 bottom-28 flex flex-col gap-6 items-center z-20">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike(video.id, index);
                                }}
                                className="group flex flex-col items-center"
                            >
                                <div className="p-3 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-all">
                                    <Heart
                                        size={28}
                                        className={`${video.is_liked ? "fill-red-500 text-red-500" : "text-white"} group-active:scale-125 transition-transform`}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-white mt-1 shadow-sm">{video.likes_count || 0}</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fetchComments(video.id);
                                }}
                                className="flex flex-col items-center"
                            >
                                <div className="p-3 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-all">
                                    <MessageCircle size={28} className="text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-white mt-1 shadow-sm">{video.comments_count || 0}</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShare(video);
                                }}
                                className="flex flex-col items-center"
                            >
                                <div className="p-3 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-all">
                                    <Share2 size={28} className="text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-white mt-1 shadow-sm">Share</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Comments Modal */}
            {showComments && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl h-[70vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Comments ({currentComments.length})</h3>
                            <button onClick={() => setShowComments(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {currentComments.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <MessageCircle size={40} className="mx-auto mb-2 opacity-20" />
                                    <p>No comments yet. Be the first!</p>
                                </div>
                            ) : (
                                currentComments.map((c, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#dc3545] flex items-center justify-center text-white text-xs font-bold uppercase">
                                            {c.user_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">{c.user_name}</p>
                                            <p className="text-sm text-gray-600 leading-relaxed">{c.comment}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handlePostComment} className="p-4 border-t bg-gray-50 rounded-b-2xl">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    className="flex-1 px-4 py-2 border rounded-full text-sm focus:ring-2 focus:ring-[#dc3545] outline-none"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={commentLoading || !newComment.trim()}
                                    className="px-4 py-2 bg-[#dc3545] text-white rounded-full text-sm font-bold disabled:opacity-50"
                                >
                                    Post
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
            .scrollbar-hide::-webkit-scrollbar {
                display: none;
            }
            .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .player-wrapper {
                position: relative;
                width: 100%;
                height: 100%;
            }
            video {
                object-fit: cover;
            }
        `}</style>
        </div>
    );
};

export default VideoFeed;
